import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const { send, readPrices } = vi.hoisted(() => ({ send: vi.fn(), readPrices: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: vi.fn() }));
vi.mock("@/services/email", () => ({ getEmailProvider: () => ({ send }) }));
vi.mock("@/services/email/templates", () => ({ buildOwnerNotificationEmail: () => ({ to: "owner@example.invalid", text: "Saved request", html: "Saved request", subject: "Synthetic" }), buildGuestAcknowledgementEmail: () => ({}) }));
vi.mock("@/services/pricing-service", () => ({ readBookingPriceSnapshot: readPrices, PricingError: class PricingError extends Error { constructor(message:string, readonly providerCode?:string){super(message);} } }));
import { acceptGuestBooking, deliverBookingNotifications } from "@/services/guest-booking-service";
import { PricingError } from "@/services/pricing-service";
import { addDays } from "@/types/pricing";
import { manilaToday, type GuestBookingInput } from "@/types/guest-booking";
const raw = { idempotency_key: "00000000-0000-4000-8000-000000000091", full_name: "Synthetic Guest", mobile_number: "09171234567", email: "", adults: 2, children: 0,
  day_visitors: 0, vehicles: 0, package_code: "WHOLE_HOME_3BR", folding_foams_requested: false, check_in_date: addDays(manilaToday(),20), check_out_date: addDays(manilaToday(),22),
  privacy_consent: true, message: "", purpose_of_stay: "", utm_source: "", utm_medium: "", utm_campaign: "", website: "" } as GuestBookingInput;
type Client = Parameters<typeof acceptGuestBooking>[3];
afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); readPrices.mockReset(); });
describe("atomic intake service", () => {
  beforeEach(() => { readPrices.mockResolvedValue({ estimated_total_centavos: 12345, version: "00000000-0000-4000-8000-000000000092" }); });
  it("uses one transaction RPC and never reports success for rejected writes", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code:'42883',message: "private SQL details" } });
    await expect(acceptGuestBooking(raw,"a".repeat(64),"b".repeat(64),{ rpc } as unknown as Client)).rejects.toMatchObject({message:"Request could not be saved. Retry with the same details, or contact TEN29.",stage:'response',providerCode:'42883'});
    expect(readPrices).toHaveBeenCalledWith(expect.objectContaining({ rpc }), expect.objectContaining({ package_code: raw.package_code }));
    expect(rpc).toHaveBeenCalledTimes(1); expect(rpc.mock.calls[0][0]).toBe("accept_website_booking");
    expect(rpc.mock.calls[0][1].p_payload).not.toHaveProperty("source");
    expect(rpc.mock.calls[0][1].p_payload.reviewed_estimate).toMatchObject({ estimated_total_centavos: 12345 });
  });
  it("reads prices through the private service client and stops before intake if that snapshot read fails", async () => {
    readPrices.mockRejectedValue(new PricingError('private database details', '42501'));
    const rpc = vi.fn();
    await expect(acceptGuestBooking(raw,"a".repeat(64),"b".repeat(64),{ rpc } as unknown as Client))
      .rejects.toMatchObject({ message: 'We could not validate your stay request just now. No request was saved. Please retry or contact TEN29.', stage: 'pricing', providerCode: '42501' });
    expect(readPrices).toHaveBeenCalledWith(expect.objectContaining({ rpc }), expect.objectContaining({ package_code: raw.package_code }));
    expect(rpc).not.toHaveBeenCalled();
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
  it("keeps the internal rate reference out of guest notification content", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-only"); vi.stubEnv("INQUIRY_FROM_EMAIL", "from@example.invalid"); vi.stubEnv("INQUIRY_NOTIFICATION_TO", "owner@example.invalid");
    send.mockResolvedValue({ ok: true });
    const receipt = { ...raw, outcome: "SAVED", reference_code: "TEN29-SYNTHETIC", overnight_guest_count: 2, estimate: { estimated_total_centavos: 12345 } };
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { task: { id: raw.idempotency_key, lease_token: raw.idempotency_key }, inquiry: { ...raw, email: "guest@example.invalid" }, receipt }, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { task: { id: `${raw.idempotency_key}-guest`, lease_token: raw.idempotency_key }, inquiry: { ...raw, email: "guest@example.invalid" }, receipt }, error: null })
      .mockResolvedValue({ data: null, error: null });
    await deliverBookingNotifications(raw.idempotency_key, { rpc } as unknown as Client);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].text).toContain("PHP 123.45");
    expect(send.mock.calls[1][0].text).not.toContain("PHP");
    expect(send.mock.calls[1][0].html).not.toContain("123.45");
  });
  it("pauses delayed request acknowledgement after confirmation or closure",async()=>{
    vi.stubEnv("RESEND_API_KEY","synthetic-only");vi.stubEnv("INQUIRY_FROM_EMAIL","from@example.invalid");vi.stubEnv("INQUIRY_NOTIFICATION_TO","owner@example.invalid");
    const rpc=vi.fn().mockResolvedValue({data:false,error:null});await deliverBookingNotifications(raw.idempotency_key,{rpc} as unknown as Client);
    expect(rpc).toHaveBeenCalledTimes(1);expect(send).not.toHaveBeenCalled();
  });
});
