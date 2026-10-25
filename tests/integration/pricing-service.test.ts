import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { deactivateOwnerPromotion, prepareItemizedQuote, publishOwnerPromotion, publishRateDraft, readOwnerPromotion, readOwnerRates,
  readBookingPriceSnapshot, readPublicPromotionTeaser, revalidatePriceEstimate, saveOwnerPromotionDraft, saveRateDraft } from "@/services/pricing-service";
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
    await expect(readOwnerPromotion(db, "WHOLE_HOME_1BR")).rejects.toThrow("OWNER");
    await expect(deactivateOwnerPromotion(db, "WHOLE_HOME_1BR", key)).rejects.toThrow("OWNER");
    expect(rpc.mock.calls.every(([name]) => name === "is_ten29_owner")).toBe(true);
  });
  it("requires deliberate publication confirmation and strict rate payloads", async () => {
    const { db } = fixture();
    await expect(publishRateDraft(db, { revision_id: key, base_revision_id: null, idempotency_key: key, confirmed: false } as never)).rejects.toThrow("confirm");
    await expect(saveRateDraft(db, { package_code: "WHOLE_HOME_1BR", rules: [rule], base_revision_id: null, idempotency_key: key, published: true } as never)).rejects.toThrow();
  });
  it("uses the private server snapshot RPC and whitelists internal estimate data", async () => {
    const { db, rpc } = fixture(false);
    rpc.mockResolvedValue({ data: { bedrooms_opened: 3, version: key, missing_rates: false, accommodation_subtotal_centavos: 10001, estimated_total_centavos: 10001,
      nights: [{ date: window.check_in_date, amount_centavos: 10001, source: "DEFAULT", rate_revision_id: key, approved_by: "PRIVATE" }], owner_input: "SECRET", adjustments: "PRIVATE" }, error: null });
    const prices = await readBookingPriceSnapshot(db, window);
    expect(JSON.stringify(prices)).not.toMatch(/PRIVATE|SECRET|approved_by|owner_input/);
    expect(prices.package_code).toBe("WHOLE_HOME_3BR");
    expect((await revalidatePriceEstimate(db, window, null)).acknowledgement_required).toBe(true);
    expect((await revalidatePriceEstimate(db, window, key)).changed).toBe(false);
    expect(rpc.mock.calls.every(([name]) => name === "read_booking_price_snapshot")).toBe(true);
  });
  it("validates owner promotion drafts and requires both review acknowledgements before publishing", async () => {
    const { db, rpc } = fixture();
    const promotion = { package_code: "WHOLE_HOME_1BR" as const, former_amount_centavos: 50000, promotional_amount_centavos: 40000,
      eligible_from_date: "2033-01-01", eligible_to_date: "2033-01-10", minimum_nights: 2, maximum_nights: 7,
      valid_from: "2032-12-01T00:00:00+08:00", valid_until: "2032-12-15T00:00:00+08:00",
      former_price_basis: "SOLD_WITHIN_90_DAYS" as const, former_price_period: "Prior 90 days", former_price_evidence: "Synthetic owner record" };
    await expect(saveOwnerPromotionDraft(db, { base_promotion_id: null, promotion: { ...promotion, promotional_amount_centavos: 50000 }, idempotency_key: key })).rejects.toThrow("lower than");
    await expect(publishOwnerPromotion(db, { promotion_id: key, base_promotion_id: null, idempotency_key: key,
      confirmed: true, former_price_reviewed: false, dti_reviewed: true } as never)).rejects.toThrow("Review");
    expect(rpc.mock.calls.every(([name]) => name === "is_ten29_owner")).toBe(true);
  });
  it("projects only the matching package/date promotional teaser and returns null when ineligible", async () => {
    const { db, rpc } = fixture(false);
    rpc.mockResolvedValueOnce({ data: { package_code: "WHOLE_HOME_3BR", former_amount_centavos: 70000,
      promotional_amount_centavos: 60000, minimum_nights: 2, maximum_nights: 5, price_basis: "PER_NIGHT" }, error: null });
    const selection = { package_code: "WHOLE_HOME_3BR" as const, check_in_date: "2033-01-01", check_out_date: "2033-01-03" };
    const promo = await readPublicPromotionTeaser(db, selection);
    expect(promo).toEqual({ package_code: "WHOLE_HOME_3BR", former_amount_centavos: 70000, promotional_amount_centavos: 60000,
      minimum_nights: 2, maximum_nights: 5, price_basis: "PER_NIGHT" });
    expect(rpc).toHaveBeenCalledWith("read_public_promotion_teaser", { p_package: selection.package_code, p_from: selection.check_in_date, p_to: selection.check_out_date });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await readPublicPromotionTeaser(db, selection)).toBeNull();
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/standard|history|evidence|owner_input/i);
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
