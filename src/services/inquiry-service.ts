import type { Inquiry, InquiryStatus } from "@/types/inquiry";
import { isValidStatusTransition } from "@/types/inquiry";
import { generateInquiryReference } from "@/lib/reference-code";
import type { InquiryFormValues } from "@/lib/validation/inquiry-schema";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getEmailProvider } from "@/services/email";
import { buildGuestAcknowledgementEmail, buildOwnerNotificationEmail } from "@/services/email/templates";

/**
 * Derived (not hand-annotated) from the actual client factory so it always
 * matches whatever schema-generic resolution @supabase/ssr + @supabase/supabase-js
 * produce for this Database type — manually re-parameterizing SupabaseClient<>
 * here has previously resolved to `never` table types under this supabase-js
 * version's generic defaults.
 */
export type DbClient = ReturnType<typeof createSupabaseServiceRoleClient>;

export class InquiryServiceError extends Error {}

async function requireTen29Admin(client: DbClient): Promise<void> {
  const { data, error } = await client.rpc("is_ten29_admin");
  if (error || data !== true) throw new InquiryServiceError("Unauthorized");
}

const MAX_REFERENCE_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";

async function writeAuditEvent(
  client: DbClient,
  inquiryId: string,
  eventType: string,
  previousValue: string | null,
  newValue: string | null,
  actor = "system"
): Promise<void> {
  await client.from("inquiry_audit_events").insert({
    inquiry_id: inquiryId,
    event_type: eventType,
    previous_value: previousValue,
    new_value: newValue,
    actor,
  });
}

/** Step 1 of the enquiry flow: persist before any notification is attempted. */
export async function createInquiry(input: InquiryFormValues, client: DbClient): Promise<Inquiry> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const referenceCode = generateInquiryReference();
    const { data, error } = await client
      .from("inquiries")
      .insert({
        reference_code: referenceCode,
        source: input.source || "website",
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
        full_name: input.full_name,
        email: input.email || null,
        mobile_number: input.mobile_number,
        check_in_date: input.check_in_date,
        check_out_date: input.check_out_date,
        adults: input.adults,
        children: input.children,
        day_visitors: input.day_visitors,
        vehicles: input.vehicles,
        purpose_of_stay: input.purpose_of_stay || null,
        message: input.message || null,
        privacy_consent: input.privacy_consent,
      })
      .select()
      .single();

    if (!error && data) {
      await writeAuditEvent(client, data.id, "CREATED", null, data.status);
      return data as Inquiry;
    }

    if (error?.code === UNIQUE_VIOLATION) {
      lastError = error.message;
      continue;
    }

    throw new InquiryServiceError(error?.message ?? "Failed to save enquiry");
  }

  throw new InquiryServiceError(lastError ?? "Failed to generate a unique reference code");
}

/** Step 2: notify the owner. Never rolls back the stored inquiry on failure. */
export async function attemptOwnerNotification(inquiry: Inquiry, client: DbClient): Promise<Inquiry> {
  await writeAuditEvent(client, inquiry.id, "NOTIFICATION_ATTEMPTED", null, null);

  const result = await getEmailProvider().send(buildOwnerNotificationEmail(inquiry));
  const notificationStatus = result.ok ? "SENT" : "FAILED";
  const notificationError = result.ok ? null : result.error;

  const { data, error } = await client
    .from("inquiries")
    .update({ notification_status: notificationStatus, notification_error: notificationError })
    .eq("id", inquiry.id)
    .select()
    .single();

  await writeAuditEvent(
    client,
    inquiry.id,
    result.ok ? "NOTIFICATION_SENT" : "NOTIFICATION_FAILED",
    null,
    result.ok ? null : result.error
  );

  if (error || !data) return inquiry;
  return data as Inquiry;
}

/** Step 3 (best-effort, only if an email was supplied). */
export async function sendGuestAcknowledgementIfApplicable(inquiry: Inquiry): Promise<void> {
  if (!inquiry.email) return;
  await getEmailProvider().send(buildGuestAcknowledgementEmail(inquiry));
}

/** Full orchestration used by the /book server action. */
export async function submitInquiry(input: InquiryFormValues): Promise<Inquiry> {
  const client = createSupabaseServiceRoleClient();
  const inquiry = await createInquiry(input, client);
  const notified = await attemptOwnerNotification(inquiry, client);
  await sendGuestAcknowledgementIfApplicable(notified);
  return notified;
}

// ---- Admin queries (session-bound client, RLS-enforced) -------------------

export interface InquiryFilters {
  status?: InquiryStatus;
  source?: string;
  checkInFrom?: string;
  search?: string;
}

export async function listInquiries(client: DbClient, filters: InquiryFilters = {}): Promise<Inquiry[]> {
  await requireTen29Admin(client);
  let query = client.from("inquiries").select("*").order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.checkInFrom) query = query.gte("check_in_date", filters.checkInFrom);
  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, "");
    query = query.or(
      `full_name.ilike.%${term}%,mobile_number.ilike.%${term}%,reference_code.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new InquiryServiceError(error.message);
  return (data ?? []) as Inquiry[];
}

export async function getInquiryById(client: DbClient, id: string): Promise<Inquiry | null> {
  await requireTen29Admin(client);
  const { data, error } = await client.from("inquiries").select("*").eq("id", id).maybeSingle();
  if (error) throw new InquiryServiceError(error.message);
  return (data as Inquiry | null) ?? null;
}

export interface AuditEvent {
  id: string;
  inquiry_id: string;
  event_type: string;
  previous_value: string | null;
  new_value: string | null;
  actor: string | null;
  created_at: string;
}

export async function getAuditEventsForInquiry(client: DbClient, inquiryId: string): Promise<AuditEvent[]> {
  await requireTen29Admin(client);
  const { data, error } = await client
    .from("inquiry_audit_events")
    .select("*")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false });
  if (error) throw new InquiryServiceError(error.message);
  return (data ?? []) as AuditEvent[];
}

export async function updateInquiryStatus(
  client: DbClient,
  id: string,
  newStatus: InquiryStatus,
  actor: string
): Promise<Inquiry> {
  await requireTen29Admin(client);
  const current = await getInquiryById(client, id);
  if (!current) throw new InquiryServiceError("Inquiry not found");
  if (!isValidStatusTransition(current.status, newStatus)) {
    throw new InquiryServiceError(`Cannot move an inquiry from ${current.status} to ${newStatus}`);
  }

  const patch: { status: InquiryStatus; contacted_at?: string; closed_at?: string } = {
    status: newStatus,
  };
  if (newStatus === "CONTACTED" && !current.contacted_at) patch.contacted_at = new Date().toISOString();
  if (newStatus === "CLOSED" && !current.closed_at) patch.closed_at = new Date().toISOString();

  const { data, error } = await client.from("inquiries").update(patch).eq("id", id).select().single();
  if (error || !data) throw new InquiryServiceError(error?.message ?? "Failed to update status");

  await writeAuditEvent(client, id, "STATUS_CHANGED", current.status, newStatus, actor);
  return data as Inquiry;
}

export async function updateInquiryNotes(
  client: DbClient,
  id: string,
  notes: string,
  actor: string
): Promise<Inquiry> {
  await requireTen29Admin(client);
  const current = await getInquiryById(client, id);
  if (!current) throw new InquiryServiceError("Inquiry not found");

  const { data, error } = await client
    .from("inquiries")
    .update({ owner_notes: notes })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new InquiryServiceError(error?.message ?? "Failed to update notes");

  await writeAuditEvent(client, id, "NOTE_CHANGED", current.owner_notes, notes, actor);
  return data as Inquiry;
}

export interface DashboardCounts {
  NEW: number;
  REVIEWING: number;
  CONTACTED: number;
  CLOSED: number;
  SPAM: number;
  notificationFailures: number;
}

export async function getDashboardCounts(client: DbClient): Promise<DashboardCounts> {
  await requireTen29Admin(client);
  const { data, error } = await client.from("inquiries").select("status, notification_status");
  if (error) throw new InquiryServiceError(error.message);

  const counts: DashboardCounts = {
    NEW: 0,
    REVIEWING: 0,
    CONTACTED: 0,
    CLOSED: 0,
    SPAM: 0,
    notificationFailures: 0,
  };

  for (const row of data ?? []) {
    counts[row.status as InquiryStatus] += 1;
    if (row.notification_status === "FAILED") counts.notificationFailures += 1;
  }

  return counts;
}

const CSV_COLUMNS = [
  "reference_code",
  "status",
  "full_name",
  "email",
  "mobile_number",
  "check_in_date",
  "check_out_date",
  "adults",
  "children",
  "day_visitors",
  "vehicles",
  "source",
  "notification_status",
  "created_at",
] as const;

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function inquiriesToCsv(inquiries: Inquiry[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const inquiry of inquiries) {
    lines.push(CSV_COLUMNS.map((column) => escapeCsvValue(inquiry[column])).join(","));
  }
  return lines.join("\n");
}
