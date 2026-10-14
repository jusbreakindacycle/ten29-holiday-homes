import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./helpers/fakeSupabaseClient";
import {
  createInquiry,
  attemptOwnerNotification,
  updateInquiryStatus,
  updateInquiryNotes,
  listInquiries,
  getDashboardCounts,
  inquiriesToCsv,
  InquiryServiceError,
} from "@/services/inquiry-service";

const mockSend = vi.fn();

vi.mock("@/services/email", () => ({
  getEmailProvider: () => ({ send: mockSend }),
}));

type FakeClient = ReturnType<typeof createFakeSupabaseClient>;

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    full_name: "Maria Santos",
    email: "maria@example.com",
    mobile_number: "+639171234567",
    check_in_date: futureDate(10),
    check_out_date: futureDate(12),
    adults: 4,
    children: 0,
    day_visitors: 0,
    vehicles: 1,
    purpose_of_stay: "",
    message: "",
    privacy_consent: true,
    source: "website",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("createInquiry", () => {
  it("persists the inquiry with a human-readable reference and a CREATED audit event", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);

    expect(inquiry.reference_code).toMatch(/^TEN29-\d{8}-[A-Z0-9]{4}$/);
    expect(inquiry.status).toBe("NEW");
    expect(client._tables.inquiry_audit_events.some((e) => e.event_type === "CREATED")).toBe(true);
  });

  it("does not let public input spoof a manual-channel enquiry source", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput({ source: "MESSENGER" }), client as any);

    expect(inquiry.source).toBe("website");
  });
});

describe("persist-before-notify (FR-INQ-011)", () => {
  beforeEach(() => { mockSend.mockReset(); vi.stubEnv('INQUIRY_NOTIFICATION_TO', 'synthetic-owner@example.invalid'); });
  afterEach(() => vi.unstubAllEnvs());
  it('missing owner destination never sends guest details to an invented address', async () => {
    vi.stubEnv('INQUIRY_NOTIFICATION_TO', '');
    const client = createFakeSupabaseClient();
    const inquiry = await createInquiry(validInput(), client as any);
    const result = await attemptOwnerNotification(inquiry, client as any);
    expect(result.notification_status).toBe('FAILED'); expect(mockSend).not.toHaveBeenCalled();
    expect(result.notification_error).not.toContain('SUPABASE');
  });

  it("stores the inquiry even before the email provider is ever called", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    mockSend.mockResolvedValue({ ok: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);

    expect(mockSend).not.toHaveBeenCalled();
    expect(client._tables.inquiries).toHaveLength(1);
    expect(client._tables.inquiries[0].id).toBe(inquiry.id);
  });

  it("marks notification SENT without altering the stored guest data when email succeeds", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    mockSend.mockResolvedValue({ ok: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await attemptOwnerNotification(inquiry, client as any);

    expect(updated.notification_status).toBe("SENT");
    expect(updated.full_name).toBe(inquiry.full_name);
  });

  it("marks notification FAILED but keeps the inquiry stored when the email provider fails", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    mockSend.mockResolvedValue({ ok: false, error: "Resend timeout" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await attemptOwnerNotification(inquiry, client as any);

    expect(updated.notification_status).toBe("FAILED");
    expect(updated.notification_error).toBe("Resend timeout");
    expect(client._tables.inquiries.find((r) => r.id === inquiry.id)).toBeTruthy();
  });
});

describe("updateInquiryStatus", () => {
  it("rejects an invalid transition (e.g. CLOSED straight to CONTACTED)", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateInquiryStatus(client as any, inquiry.id, "CLOSED", "owner@test");

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateInquiryStatus(client as any, inquiry.id, "CONTACTED", "owner@test")
    ).rejects.toThrow(InquiryServiceError);
  });

  it("applies a valid transition and stamps contacted_at", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await updateInquiryStatus(client as any, inquiry.id, "CONTACTED", "owner@test");

    expect(updated.status).toBe("CONTACTED");
    expect(updated.contacted_at).toBeTruthy();
  });
});

describe("updateInquiryNotes", () => {
  it("updates notes and records a NOTE_CHANGED audit event", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await updateInquiryNotes(client as any, inquiry.id, "Called guest, awaiting reply", "owner@test");

    expect(updated.owner_notes).toBe("Called guest, awaiting reply");
    expect(client._tables.inquiry_audit_events.some((e) => e.event_type === "NOTE_CHANGED")).toBe(true);
  });
});

describe("listInquiries / getDashboardCounts / inquiriesToCsv", () => {
  it("lists inquiries and computes dashboard counts", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createInquiry(validInput({ full_name: "Guest A" }), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createInquiry(validInput({ full_name: "Guest B" }), client as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await listInquiries(client as any);
    expect(list).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = await getDashboardCounts(client as any);
    expect(counts.NEW).toBe(2);
    expect(counts.notificationFailures).toBe(0);
  });

  it("filters by status", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateInquiryStatus(client as any, inquiry.id, "SPAM", "owner@test");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spamOnly = await listInquiries(client as any, { status: "SPAM" });
    expect(spamOnly).toHaveLength(1);
    expect(spamOnly[0].id).toBe(inquiry.id);
  });

  it("rejects an authenticated non-admin before returning guest enquiries", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient & { _setAdmin: (value: boolean) => void };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createInquiry(validInput(), client as any);
    client._setAdmin(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(listInquiries(client as any)).rejects.toThrow("Unauthorized");
  });

  it("rejects status changes for an authenticated non-admin", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient & { _setAdmin: (value: boolean) => void };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inquiry = await createInquiry(validInput(), client as any);
    client._setAdmin(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(updateInquiryStatus(client as any, inquiry.id, "CONTACTED", "attacker@test"))
      .rejects.toThrow("Unauthorized");
    expect(client._tables.inquiries[0].status).toBe("NEW");
  });

  it("exports a CSV with a header row and one row per inquiry", async () => {
    const client = createFakeSupabaseClient() as unknown as FakeClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createInquiry(validInput(), client as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await listInquiries(client as any);
    const csv = inquiriesToCsv(list);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("reference_code");
  });
});
