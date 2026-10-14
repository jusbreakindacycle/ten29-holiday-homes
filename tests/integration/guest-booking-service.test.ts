import { describe, expect, it, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: vi.fn() }));
const send = vi.hoisted(() => vi.fn());
vi.mock("@/services/email", () => ({ getEmailProvider: () => ({ send }) }));
vi.mock("@/services/email/templates", () => ({ buildOwnerNotificationEmail: () => ({ to: "owner@example.invalid", text: "Saved request", html: "Saved request", subject: "Synthetic" }), buildGuestAcknowledgementEmail: () => ({}) }));
import { acceptGuestBooking, deliverBookingNotifications } from "@/services/guest-booking-service";
import { addDays } from "@/types/pricing";
import { manilaToday, type GuestBookingInput } from "@/types/guest-booking";
const raw = { idempotency_key: "00000000-0000-4000-8000-000000000091", full_name: "Synthetic Guest", mobile_number: "+639171234567", email: "", adults: 2, children: 0,
  day_visitors: 0, vehicles: 0, package_code: "WHOLE_HOME_3BR", folding_foams_requested: false, check_in_date: addDays(manilaToday(),20), check_out_date: addDays(manilaToday(),22),
  privacy_consent: true, message: "", purpose_of_stay: "", utm_source: "", utm_medium: "", utm_campaign: "", website: "", reviewed_estimate: {} } as GuestBookingInput;
type Client = Parameters<typeof acceptGuestBooking>[3];
afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); });
describe("atomic intake service", () => {
  it("uses one transaction RPC and never reports success for rejected writes", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "private SQL details" } });
    await expect(acceptGuestBooking(raw,"a".repeat(64),"b".repeat(64),{ rpc } as unknown as Client)).rejects.toThrow("could not be saved");
    expect(rpc).toHaveBeenCalledTimes(1); expect(rpc.mock.calls[0][0]).toBe("accept_website_booking");
    expect(rpc.mock.calls[0][1].p_payload).not.toHaveProperty("source");
  });
  it("rejects honeypots honestly but has no fast-submission timing trap", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { outcome: "SAVED" }, error: null });
    await expect(acceptGuestBooking({ ...raw, website: "bot" },"a".repeat(64),"b".repeat(64),{ rpc } as unknown as Client)).rejects.toThrow("not saved");
    expect(rpc).not.toHaveBeenCalled();
    await expect(acceptGuestBooking(raw,"a".repeat(64),"b".repeat(64),{ rpc } as unknown as Client)).resolves.toMatchObject({ outcome: "SAVED" });
  });
  it("leaves unconfigured notification tasks pending without claiming delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); const rpc = vi.fn();
    await deliverBookingNotifications(raw.idempotency_key,{ rpc } as unknown as Client); expect(rpc).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it("provider failure records FAILED separately and reuses a stable task key", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-only"); vi.stubEnv("INQUIRY_FROM_EMAIL", "from@example.invalid"); vi.stubEnv("INQUIRY_NOTIFICATION_TO", "owner@example.invalid");
    send.mockResolvedValue({ ok: false, error: "private provider error" });
    const rpc = vi.fn().mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({ data: { task: { id: raw.idempotency_key, lease_token: raw.idempotency_key }, inquiry: {}, receipt: { ...raw, overnight_guest_count: 2, estimate: { estimated_total_centavos: null } } }, error: null }).mockResolvedValue({ data: null, error: null });
    await deliverBookingNotifications(raw.idempotency_key,{ rpc } as unknown as Client);
    expect(send.mock.calls[0][0].idempotencyKey).toBe(`booking-notification/${raw.idempotency_key}`);
    expect(rpc).toHaveBeenCalledWith("finish_booking_notification", expect.objectContaining({ p_sent: false }));
    expect(rpc.mock.calls.every(([name]) => !/delete|accept_website/.test(name))).toBe(true);
  });
  it("pauses delayed request acknowledgement after confirmation or closure",async()=>{
    vi.stubEnv("RESEND_API_KEY","synthetic-only");vi.stubEnv("INQUIRY_FROM_EMAIL","from@example.invalid");vi.stubEnv("INQUIRY_NOTIFICATION_TO","owner@example.invalid");
    const rpc=vi.fn().mockResolvedValue({data:false,error:null});await deliverBookingNotifications(raw.idempotency_key,{rpc} as unknown as Client);
    expect(rpc).toHaveBeenCalledTimes(1);expect(send).not.toHaveBeenCalled();
  });
});
