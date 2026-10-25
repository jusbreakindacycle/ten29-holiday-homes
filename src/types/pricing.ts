import { z } from "zod";
import { BOOKING_PACKAGE_CODES, type BookingPackageCode } from "./booking";

export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Enter a valid calendar date.");
export const centavos = z.number().int().min(0).max(999999999);
export const rateRuleSchema = z.object({
  kind: z.enum(["DEFAULT", "WEEKDAY", "DATE", "RANGE"]),
  amount_centavos: centavos,
  weekday: z.number().int().min(0).max(6).nullable(),
  start_date: calendarDate.nullable(),
  end_date: calendarDate.nullable(),
}).strict().refine((r) => {
  if (r.kind === "DEFAULT") return r.weekday === null && r.start_date === null && r.end_date === null;
  if (r.kind === "WEEKDAY") return r.weekday !== null && r.start_date === null && r.end_date === null;
  return r.weekday === null && !!r.start_date && !!r.end_date && calendarDate.safeParse(r.start_date).success
    && calendarDate.safeParse(r.end_date).success && r.end_date > r.start_date
    && (r.kind !== "DATE" || addDays(r.start_date, 1) === r.end_date);
}, "Rule dates and weekday do not match its type.");
export type RateRule = z.infer<typeof rateRuleSchema>;
export const rateRulesSchema = z.array(rateRuleSchema).max(2048).superRefine((rules, context) => {
  const duplicate = rules.some((r, i) => rules.slice(0, i).some((other) => r.kind === other.kind && (
    r.kind === "DEFAULT" || (r.kind === "WEEKDAY" && r.weekday === other.weekday)
    || (r.kind === "DATE" && r.start_date === other.start_date)
    || (r.kind === "RANGE" && r.start_date! < other.end_date! && other.start_date! < r.end_date!)
  )));
  if (duplicate) context.addIssue({ code: "custom", message: "Conflicting rules: remove the existing rule before adding an overlapping range or duplicate." });
});
export const saveRateDraftSchema = z.object({
  package_code: z.enum(BOOKING_PACKAGE_CODES), base_revision_id: z.string().uuid().nullable(),
  rules: rateRulesSchema, idempotency_key: z.string().uuid(),
}).strict();
export const publishRateSchema = z.object({
  revision_id: z.string().uuid(), base_revision_id: z.string().uuid().nullable(),
  idempotency_key: z.string().uuid(), confirmed: z.literal(true),
}).strict();
export const promotionDraftSchema = z.object({
  package_code: z.enum(BOOKING_PACKAGE_CODES),
  former_amount_centavos: centavos,
  promotional_amount_centavos: centavos.min(1),
  eligible_from_date: calendarDate,
  eligible_to_date: calendarDate,
  minimum_nights: z.number().int().min(1).max(366),
  maximum_nights: z.number().int().min(1).max(366),
  valid_from: z.string().datetime({ offset: true }),
  valid_until: z.string().datetime({ offset: true }),
  former_price_basis: z.enum(["SOLD_WITHIN_90_DAYS", "OFFERED_4_WEEKS_WITHIN_90_DAYS", "OLDER_PERIOD_DISCLOSED"]),
  former_price_period: z.string().trim().min(1).max(240),
  former_price_evidence: z.string().trim().min(1).max(1000),
}).strict().superRefine((value, context) => {
  if (value.promotional_amount_centavos >= value.former_amount_centavos) {
    context.addIssue({ code: "custom", path: ["promotional_amount_centavos"], message: "Promotional price must be lower than the stated former price." });
  }
  if (value.eligible_to_date <= value.eligible_from_date) {
    context.addIssue({ code: "custom", path: ["eligible_to_date"], message: "The eligible end date must be after the start date." });
  }
  if (value.maximum_nights < value.minimum_nights) {
    context.addIssue({ code: "custom", path: ["maximum_nights"], message: "Maximum nights must be at least the minimum." });
  }
  if (Date.parse(value.valid_until) <= Date.parse(value.valid_from)) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Promotion expiry must be after its start." });
  }
});
export type PromotionDraft = z.infer<typeof promotionDraftSchema>;
export const savePromotionDraftSchema = z.object({
  base_promotion_id: z.string().uuid().nullable(),
  promotion: promotionDraftSchema,
  idempotency_key: z.string().uuid(),
}).strict();
export const publishPromotionSchema = z.object({
  promotion_id: z.string().uuid(),
  base_promotion_id: z.string().uuid().nullable(),
  idempotency_key: z.string().uuid(),
  confirmed: z.literal(true),
  former_price_reviewed: z.literal(true),
  dti_reviewed: z.literal(true),
}).strict();
export type PromotionRecord = PromotionDraft & {
  id: string; revision: number; status: "DRAFT" | "PUBLISHED";
  base_promotion_id: string | null;
  created_at: string; published_at: string | null;
};
export type OwnerPromotionState = {
  package_code: BookingPackageCode;
  active_promotion_id: string | null;
  active: PromotionRecord | null;
  history: PromotionRecord[];
};
export const publicPromotionTeaserSchema = z.object({
  package_code: z.enum(BOOKING_PACKAGE_CODES),
  former_amount_centavos: centavos.min(1),
  promotional_amount_centavos: centavos.min(1),
  minimum_nights: z.number().int().min(1).max(366),
  maximum_nights: z.number().int().min(1).max(366),
  price_basis: z.literal("PER_NIGHT"),
  former_price_period: z.string().trim().min(1).max(240).optional(),
}).strict().superRefine((value, context) => {
  if (value.promotional_amount_centavos >= value.former_amount_centavos) context.addIssue({
    code: "custom", path: ["promotional_amount_centavos"], message: "Promotional price must be lower than the former price.",
  });
  if (value.maximum_nights < value.minimum_nights) context.addIssue({ code: "custom", path: ["maximum_nights"], message: "Invalid promotion stay length." });
});
export type PublicPromotionTeaser = z.infer<typeof publicPromotionTeaserSchema>;
export const priceWindowSchema = z.object({
  package_code: z.enum(BOOKING_PACKAGE_CODES), check_in_date: calendarDate, check_out_date: calendarDate,
  // Pricing selection uses countable guests; actual age-band headcount is stored on the request.
  overnight_guest_count: z.number().int().min(1).max(8), folding_foams_requested: z.boolean(),
}).strict().superRefine((value, context) => {
  const span = nightDates(value.check_in_date, value.check_out_date);
  if (span.length === 0 || span.length > 366) context.addIssue({ code: "custom", message: "Choose between 1 and 366 nights." });
  const included = value.package_code === "WHOLE_HOME_1BR" ? 2 : value.package_code === "WHOLE_HOME_2BR" ? 4 : 6;
  const maximum = value.package_code === "WHOLE_HOME_1BR" ? 3 : value.package_code === "WHOLE_HOME_2BR" ? 5 : 8;
  if (value.overnight_guest_count > maximum || (value.overnight_guest_count > included && !value.folding_foams_requested)) context.addIssue({code:"custom",message:"Review package eligibility and extra-guest request."});
});
export type PriceWindow = z.infer<typeof priceWindowSchema>;
export type NightlyPrice = { date: string; package_code: BookingPackageCode; amount_centavos: number | null; source: string; rate_revision_id: string | null; reason?: string; approved_by?: string; approved_at?: string };
export type PublicPriceEstimate = PriceWindow & {
  bedrooms_opened: number; private_whole_house: true; version: string | null; nights: NightlyPrice[];
  missing_rates: boolean; accommodation_subtotal_centavos: number | null; estimated_total_centavos: number | null;
  estimate_kind: "ACCOMMODATION_ONLY"; currency: "PHP"; promotion?: PublicPromotionTeaser | null;
};
export type RateRevision = { id: string; revision: number; status: "DRAFT" | "PUBLISHED"; base_revision_id: string | null; created_at: string; published_at: string | null; rules: RateRule[] };
export type OwnerRateState = { package_code: BookingPackageCode; published_revision_id: string | null; published_rules: RateRule[]; history: RateRevision[] };

export const adjustmentInputSchema = z.object({
  type: z.enum(["CHARGE", "DISCOUNT"]), description: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(1000), unit_amount_centavos: centavos,
  reason: z.string().trim().min(1).max(200),
}).strict();
export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;
export type QuoteAdjustment = AdjustmentInput & { nights?:number; status: "APPROVED" | "PENDING"; approved_by: string | null; approved_at: string | null; line_total_centavos: number };
export const prepareQuoteSchema = z.object({
  request_id: z.string().uuid(), expected_rate_revision_id: z.string().uuid().nullable(),
  required_down_payment_centavos: z.number().int().min(0).max(999999999999).nullable(),
  adjustments: z.array(adjustmentInputSchema).max(50),
  manual_nights: z.array(z.object({ date: calendarDate, amount_centavos: centavos, reason: z.string().trim().min(1).max(200) }).strict()).max(366),
  refundable_security_deposit_centavos: z.number().int().min(0).max(999999999999).nullable(),
  conditions: z.string().trim().max(500).nullable(), valid_until: z.string().datetime({ offset: true }).nullable(),
  idempotency_key: z.string().uuid(),
}).strict();
export type QuoteBreakdown = {
  policy?: {version:string;countable:number;exempt_children:number;actual_occupants:number;extra_approved:number;extra_rate_centavos:number;extra_nights:number;extra_total_centavos:number};
  legacy?: boolean; quote_id: string; revision: number; status: "DRAFT" | "ISSUED"; currency: string;
  booking: { reference: string; request_id?: string; guest_count: number | null; package_code: BookingPackageCode; bedrooms_opened: number; check_in_date: string; check_out_date: string; nights: number };
  accommodation: { nights: NightlyPrice[]; subtotal_centavos: number | null }; adjustments: QuoteAdjustment[];
  additional_charges_centavos: number | null; discounts_centavos: number | null;
  final_total_centavos: number | null; verified_payments_centavos: number; remaining_balance_centavos: number | null; overpayment_centavos: number | null;
  payment: { mode?:string; basis?:string; balance_due_date?:string; remaining_required_centavos?:number; boundary_review_required?:boolean; required_down_payment_centavos: number | null; refundable_security_deposit_centavos: number | null; conditions: string | null };
};

// Date-only ordinals: no local clock or elapsed-stay fee calculations.
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function nightDates(start: string, end: string): string[] {
  if (!calendarDate.safeParse(start).success || !calendarDate.safeParse(end).success) return [];
  const output: string[] = [];
  for (let date = start; date < end && output.length <= 366; date = addDays(date, 1)) output.push(date);
  return output;
}
export function phpToCentavos(input: string): number {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(input)) throw new Error("Enter a PHP amount with at most two decimal places.");
  const [whole, fraction = ""] = input.split(".");
  return centavos.parse(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function formatPhp(amount: number | null): string {
  if (amount === null) return "Request a quote";
  if (!Number.isSafeInteger(amount)) throw new Error("Invalid currency amount");
  const sign = amount < 0 ? "-" : ""; const positive = Math.abs(amount);
  return `${sign}PHP ${Math.floor(positive / 100).toLocaleString("en-PH")}.${String(positive % 100).padStart(2, "0")}`;
}
