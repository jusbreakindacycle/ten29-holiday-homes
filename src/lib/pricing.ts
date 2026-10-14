import { adjustmentInputSchema, nightDates, rateRulesSchema, type NightlyPrice, type QuoteAdjustment, type RateRule } from "@/types/pricing";
import type { BookingPackageCode } from "@/types/booking";

export function previewRateRules(packageCode: BookingPackageCode, rules: RateRule[], start: string, end: string): NightlyPrice[] {
  const validated = rateRulesSchema.parse(rules);
  const priority = { DATE: 1, RANGE: 2, WEEKDAY: 3, DEFAULT: 4 };
  return nightDates(start, end).map((date) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const rule = validated.filter((r) => r.kind === "DEFAULT" || (r.kind === "WEEKDAY" && r.weekday === weekday)
      || ((r.kind === "DATE" || r.kind === "RANGE") && date >= r.start_date! && date < r.end_date!))
      .sort((a, b) => priority[a.kind] - priority[b.kind])[0];
    return { date, package_code: packageCode, amount_centavos: rule?.amount_centavos ?? null, source: rule?.kind ?? "MISSING", rate_revision_id: null };
  });
}
export function calculateQuotation(nights: NightlyPrice[], adjustments: QuoteAdjustment[]) {
  if (nights.length === 0 || nights.some((n) => n.amount_centavos === null)) throw new Error("Missing nightly rates");
  let subtotal = 0, charges = 0, discounts = 0;
  for (const night of nights) {
    if (!Number.isSafeInteger(night.amount_centavos) || night.amount_centavos! < 0) throw new Error("Invalid nightly amount");
    subtotal += night.amount_centavos!;
  }
  for (const adjustment of adjustments) {
    const validated = adjustmentInputSchema.parse({ type: adjustment.type, description: adjustment.description,
      quantity: adjustment.quantity, unit_amount_centavos: adjustment.unit_amount_centavos, reason: adjustment.reason });
    if (adjustment.status !== "APPROVED") continue;
    if (!adjustment.approved_by || !adjustment.approved_at) throw new Error("Missing owner approval attribution");
    if (adjustment.nights !== undefined && (!Number.isInteger(adjustment.nights) || adjustment.nights !== nights.length
      || validated.type !== 'CHARGE' || validated.unit_amount_centavos !== 40000 || validated.quantity > 2)) throw Error('Invalid approved extra-guest line');
    const amount = validated.quantity * validated.unit_amount_centavos * (adjustment.nights ?? 1);
    if (validated.type === "DISCOUNT") discounts += amount; else charges += amount;
  }
  const total = subtotal + charges - discounts;
  if (!Number.isSafeInteger(total) || total < 0 || total > 999999999999) throw new Error("Invalid quotation total");
  return { accommodation_subtotal_centavos: subtotal, additional_charges_centavos: charges, discounts_centavos: discounts,
    adjustment_total_centavos: charges - discounts, final_total_centavos: total };
}
