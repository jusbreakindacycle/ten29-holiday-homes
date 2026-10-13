import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { guestBookingSchema, type GuestBookingInput, type IntakeResult } from "@/types/guest-booking";
import { getEmailProvider } from "./email";
import { buildGuestAcknowledgementEmail, buildOwnerNotificationEmail } from "./email/templates";
import type { Inquiry } from "@/types/inquiry";
import type { BookingReceipt } from "@/types/guest-booking";
import { formatPhp } from "@/types/pricing";

export class GuestBookingError extends Error {}
export async function acceptGuestBooking(raw: GuestBookingInput, sessionHash: string, abuseHash: string,
  client = createSupabaseServiceRoleClient()): Promise<IntakeResult> {
  const parsed = guestBookingSchema.safeParse(raw);
  if (!parsed.success) throw new GuestBookingError(parsed.error.issues[0]?.message ?? "Review your request.");
  if (parsed.data.website) throw new GuestBookingError("Request not saved. Leave the website field empty or contact TEN29 for help.");
  const { idempotency_key, website: _website, ...payload } = parsed.data;
  void _website;
  const { data, error } = await client.rpc("accept_website_booking", { p_payload: payload, p_session: sessionHash, p_key: idempotency_key, p_abuse: abuseHash });
  if (error || !data) throw new GuestBookingError("Request could not be saved. Retry with the same details, or contact TEN29.");
  return data;
}
export async function deliverBookingNotifications(requestId: string, client = createSupabaseServiceRoleClient()): Promise<void> {
  // No attempted delivery is claimed when operational email is unconfigured.
  if (!process.env.INQUIRY_FROM_EMAIL || !process.env.INQUIRY_NOTIFICATION_TO || !process.env.RESEND_API_KEY) return;
  for (const kind of ["OWNER", "GUEST"]) {
    const { data, error } = await client.rpc("claim_booking_notification", { p_request: requestId, p_kind: kind });
    if (error || !data) continue;
    const { task, inquiry, receipt } = data as { task: { id: string; lease_token: string }; inquiry: Inquiry; receipt: BookingReceipt };
    let sent = false;
    try {
      // Fail closed if operational destination/from is not configured; never invent a live recipient.
      if (process.env.INQUIRY_FROM_EMAIL && (kind === "GUEST" || process.env.INQUIRY_NOTIFICATION_TO)) {
        const message = kind === "OWNER" ? buildOwnerNotificationEmail(inquiry) : buildGuestAcknowledgementEmail(inquiry);
        const summary = `\nPackage: ${receipt.package_code}\nOvernight guests: ${receipt.overnight_guest_count}\nAdditional folding foams: ${receipt.folding_foams_requested ? "Requested" : "No"}\nAccommodation estimate: ${formatPhp(receipt.estimate.estimated_total_centavos)}\nDates are not reserved. Owner review and final quotation are required.`;
        const result = await getEmailProvider().send({ ...message, text: message.text + summary,
          html: message.html + `<p>${summary.replace(/\n/g, "<br>")}</p>`, idempotencyKey: `booking-notification/${task.id}` });
        sent = result.ok;
      }
    } catch { /* Task remains retryable; no provider details or PII in logs. */ }
    await client.rpc("finish_booking_notification", { p_task: task.id, p_token: task.lease_token, p_sent: sent });
  }
}
