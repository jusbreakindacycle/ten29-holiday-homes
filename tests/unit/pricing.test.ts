import { describe, expect, it } from "vitest";
import { calculateQuotation, previewRateRules } from "@/lib/pricing";
import { addDays, formatPhp, phpToCentavos, priceWindowSchema, promotionDraftSchema, rateRulesSchema, type QuoteAdjustment, type RateRule } from "@/types/pricing";
const rule = (kind: RateRule["kind"], amount_centavos: number, extra: Partial<RateRule> = {}): RateRule =>
  ({ kind, amount_centavos, weekday: null, start_date: null, end_date: null, ...extra });
describe("calendar rate resolution", () => {
  const rules = [rule("DEFAULT", 10001), rule("WEEKDAY", 12003, { weekday: 5 }),
    rule("RANGE", 20005, { start_date: "2032-12-30", end_date: "2033-01-03" }),
    rule("DATE", 30007, { start_date: "2032-12-31", end_date: "2033-01-01" })];
  it("resolves default, weekday, range and single-date precedence without ambiguity", () => {
    const result = previewRateRules("WHOLE_HOME_3BR", rules, "2032-12-30", "2033-01-02");
    expect(result.map((n) => [n.date, n.amount_centavos, n.source])).toEqual([
      ["2032-12-30", 20005, "RANGE"], ["2032-12-31", 30007, "DATE"], ["2033-01-01", 20005, "RANGE"],
    ]);
    expect(previewRateRules("WHOLE_HOME_1BR", rules, "2032-12-24", "2032-12-25")[0].source).toBe("WEEKDAY");
    expect(previewRateRules("WHOLE_HOME_1BR", rules, "2032-12-23", "2032-12-24")[0].source).toBe("DEFAULT");
  });
  it("distinguishes missing rates from explicitly owner-chosen zero rates", () => {
    expect(previewRateRules("WHOLE_HOME_1BR", [], "2033-01-01", "2033-01-02")[0].amount_centavos).toBeNull();
    expect(previewRateRules("WHOLE_HOME_1BR", [rule("DEFAULT", 0)], "2033-01-01", "2033-01-02")[0].amount_centavos).toBe(0);
    expect(formatPhp(null)).toBe("Request a quote");
  });
  it("rejects conflicting ranges but permits intentional single-date priority", () => {
    expect(rateRulesSchema.safeParse([rule("RANGE", 1, { start_date: "2033-01-01", end_date: "2033-02-01" }),
      rule("RANGE", 2, { start_date: "2033-01-20", end_date: "2033-02-02" })]).success).toBe(false);
    expect(rateRulesSchema.safeParse(rules).success).toBe(true);
  });
  it("rejects duplicate defaults and weekdays and invalid single-date spans", () => {
    expect(rateRulesSchema.safeParse([rule("DEFAULT", 1), rule("DEFAULT", 2)]).success).toBe(false);
    expect(rateRulesSchema.safeParse([rule("WEEKDAY", 1, { weekday: 1 }), rule("WEEKDAY", 2, { weekday: 1 })]).success).toBe(false);
    expect(rateRulesSchema.safeParse([rule("DATE", 1, { start_date: "2033-01-01", end_date: "2033-01-03" })]).success).toBe(false);
  });
  it("validates chosen larger packages, foams and bounded calendar dates", () => {
    const base = { package_code: "WHOLE_HOME_3BR", check_in_date: "2033-01-01", check_out_date: "2033-01-03", overnight_guest_count: 2, folding_foams_requested: false };
    expect(priceWindowSchema.safeParse(base).success).toBe(true);
    expect(priceWindowSchema.safeParse({ ...base, overnight_guest_count: 8 }).success).toBe(false);
    expect(priceWindowSchema.safeParse({ ...base, overnight_guest_count: 8, folding_foams_requested: true }).success).toBe(true);
    expect(priceWindowSchema.safeParse({ ...base, package_code: "WHOLE_HOME_1BR", overnight_guest_count: 4 }).success).toBe(false);
    expect(priceWindowSchema.safeParse({ ...base, check_in_date: "2033-99-01", check_out_date: "2034-01-01" }).success).toBe(false);
    expect(priceWindowSchema.safeParse({ ...base, check_out_date: "2035-01-01" }).success).toBe(false);
    expect(addDays("2032-12-31", 1)).toBe("2033-01-01");
  });
});
describe("owner promotion validation", () => {
  const promotion = {
    package_code: "WHOLE_HOME_2BR", former_amount_centavos: 50000, promotional_amount_centavos: 40000,
    eligible_from_date: "2033-01-01", eligible_to_date: "2033-02-01", minimum_nights: 2, maximum_nights: 7,
    valid_from: "2032-12-01T00:00:00+08:00", valid_until: "2032-12-15T00:00:00+08:00",
    former_price_basis: "OFFERED_4_WEEKS_WITHIN_90_DAYS", former_price_period: "Offered during the documented qualifying period",
    former_price_evidence: "Owner-held contemporaneous price records",
  } as const;
  it("accepts explicit centavo values and former-price evidence for an eligible package", () => {
    expect(promotionDraftSchema.parse(promotion).promotional_amount_centavos).toBe(40000);
  });
  it("rejects equal or higher prices, invalid date windows, and missing comparison evidence", () => {
    expect(promotionDraftSchema.safeParse({ ...promotion, promotional_amount_centavos: 50000 }).success).toBe(false);
    expect(promotionDraftSchema.safeParse({ ...promotion, promotional_amount_centavos: 50001 }).success).toBe(false);
    expect(promotionDraftSchema.safeParse({ ...promotion, eligible_to_date: promotion.eligible_from_date }).success).toBe(false);
    expect(promotionDraftSchema.safeParse({ ...promotion, maximum_nights: 1 }).success).toBe(false);
    expect(promotionDraftSchema.safeParse({ ...promotion, former_price_evidence: "" }).success).toBe(false);
    expect(promotionDraftSchema.safeParse({ ...promotion, promotional_amount_centavos: 40000.5 }).success).toBe(false);
  });
});
describe("exact itemized quotation calculations", () => {
  const nights = previewRateRules("WHOLE_HOME_3BR", [rule("DEFAULT", 50011)], "2032-12-31", "2033-01-02");
  const approved = (type: QuoteAdjustment["type"], quantity: number, unit_amount_centavos: number): QuoteAdjustment =>
    ({ type, quantity, unit_amount_centavos, description: "Individual arrangement", reason: "Owner decision", status: "APPROVED", approved_by: "owner-id", approved_at: "2032-12-01T00:00:00Z", line_total_centavos: 999999 });
  it("calculates charges and discounts from quantity/units rather than a client line total", () => {
    const result = calculateQuotation(nights, [approved("CHARGE", 2, 100), approved("DISCOUNT", 1, 50)]);
    expect(result).toEqual({ accommodation_subtotal_centavos: 100022, additional_charges_centavos: 200, discounts_centavos: 50, adjustment_total_centavos: 150, final_total_centavos: 100172 });
  });
  it("excludes pending adjustments, requires attribution, and assumes no fees", () => {
    expect(calculateQuotation(nights, [{ ...approved("CHARGE", 1, 1000), status: "PENDING", approved_by: null, approved_at: null }]).final_total_centavos).toBe(100022);
    expect(calculateQuotation(nights, []).final_total_centavos).toBe(100022);
    expect(() => calculateQuotation(nights, [{ ...approved("CHARGE", 1, 1), approved_by: null }])).toThrow("approval attribution");
  });
  it("rejects over-discounting, missing rates and fractional currency", () => {
    expect(() => calculateQuotation(nights, [approved("DISCOUNT", 1, 999999)])).toThrow("Invalid quotation total");
    expect(() => calculateQuotation([{ ...nights[0], amount_centavos: null }], [])).toThrow("Missing nightly rates");
    expect(() => calculateQuotation([{ ...nights[0], amount_centavos: 0.1 }], [])).toThrow("Invalid nightly amount");
  });
  it("parses PHP decimals without floating-point multiplication", () => {
    expect(phpToCentavos("100.01")).toBe(10001); expect(phpToCentavos("0.29")).toBe(29);
    expect(formatPhp(-50)).toBe("-PHP 0.50");
    expect(() => phpToCentavos("1.001")).toThrow(); expect(() => phpToCentavos("1e6")).toThrow();
  });
});
