import { describe, expect, it, vi } from "vitest";
import { prepareItemizedQuote, publishRateDraft, readOwnerRates, readPublicPrices, revalidatePriceEstimate, saveRateDraft } from "@/services/pricing-service";
import type { BookingDbClient } from "@/services/booking-service";
const key = "00000000-0000-4000-8000-000000000051";
const window = { package_code: "WHOLE_HOME_3BR" as const, check_in_date: "2033-01-01", check_out_date: "2033-01-02", overnight_guest_count: 2, folding_foams_requested: false };
const rule = { kind: "DEFAULT" as const, amount_centavos: 10001, weekday: null, start_date: null, end_date: null };
function fixture(owner = true) {
  const rpc = vi.fn(async (name: string): Promise<{ data: unknown; error: { code: string; message: string } | null }> => ({ data: name === "is_ten29_owner" ? owner : key, error: null }));
  return { rpc, db: { rpc, auth: { getUser: async () => ({ data: { user: { id: key } }, error: null }) } } as unknown as BookingDbClient };
}
describe("pricing service authorization and projection", () => {
  it("denies managers/nonowners before saving, publishing or exposing draft state", async () => {
    const { db, rpc } = fixture(false);
    await expect(readOwnerRates(db, "WHOLE_HOME_1BR")).rejects.toThrow("OWNER");
    await expect(saveRateDraft(db, { package_code: "WHOLE_HOME_1BR", rules: [rule], base_revision_id: null, idempotency_key: key })).rejects.toThrow("OWNER");
    await expect(publishRateDraft(db, { revision_id: key, base_revision_id: null, idempotency_key: key, confirmed: true })).rejects.toThrow("OWNER");
    expect(rpc.mock.calls.every(([name]) => name === "is_ten29_owner")).toBe(true);
  });
  it("requires deliberate publication confirmation and strict rate payloads", async () => {
    const { db } = fixture();
    await expect(publishRateDraft(db, { revision_id: key, base_revision_id: null, idempotency_key: key, confirmed: false } as never)).rejects.toThrow("confirm");
    await expect(saveRateDraft(db, { package_code: "WHOLE_HOME_1BR", rules: [rule], base_revision_id: null, idempotency_key: key, published: true } as never)).rejects.toThrow();
  });
  it("public reads whitelist data and revalidation discloses new versions", async () => {
    const { db, rpc } = fixture(false);
    rpc.mockResolvedValue({ data: { bedrooms_opened: 3, version: key, missing_rates: false, accommodation_subtotal_centavos: 10001, estimated_total_centavos: 10001,
      nights: [{ date: window.check_in_date, amount_centavos: 10001, source: "DEFAULT", rate_revision_id: key, approved_by: "PRIVATE" }], owner_input: "SECRET", adjustments: "PRIVATE" }, error: null });
    const prices = await readPublicPrices(db, window);
    expect(JSON.stringify(prices)).not.toMatch(/PRIVATE|SECRET|approved_by|owner_input/);
    expect(prices.package_code).toBe("WHOLE_HOME_3BR");
    expect((await revalidatePriceEstimate(db, window, null)).acknowledgement_required).toBe(true);
    expect((await revalidatePriceEstimate(db, window, key)).changed).toBe(false);
    expect(rpc.mock.calls.every(([name]) => name === "read_public_calendar_prices")).toBe(true);
  });
  it("does not trust aggregate quote totals, adjustment approval flags or client identities", async () => {
    const { db, rpc } = fixture();
    const input = { request_id: key, expected_rate_revision_id: null, required_down_payment_centavos: null, adjustments: [], manual_nights: [], refundable_security_deposit_centavos: null, conditions: null, valid_until: null, idempotency_key: key };
    await expect(prepareItemizedQuote(db, { ...input, amount_total: 1 } as never)).rejects.toThrow("Invalid itemized");
    await expect(prepareItemizedQuote(db, { ...input, adjustments: [{ type: "CHARGE", description: "x", reason: "x", quantity: 1, unit_amount_centavos: 1, approved: true }] } as never)).rejects.toThrow("Invalid itemized");
    expect(rpc.mock.calls.some(([name]) => name === "prepare_itemized_booking_quote")).toBe(false);
  });
  it("returns safe conflict messages without leaking raw database detail", async () => {
    const { db, rpc } = fixture();
    rpc.mockImplementation(async (name) => name === "is_ten29_owner" ? { data: true, error: null }
      : { data: null, error: { code: "23P01", message: "PRIVATE financial detail" } });
    await expect(saveRateDraft(db, { package_code: "WHOLE_HOME_1BR", rules: [rule], base_revision_id: null, idempotency_key: key })).rejects.toThrow("Conflicting rule");
  });
});
