import { z } from "zod";
import type { BookingDbClient } from "./booking-service";
import { BOOKING_PACKAGE_CODES, type BookingPackageCode } from "@/types/booking";
import { priceWindowSchema, prepareQuoteSchema, publishRateSchema, saveRateDraftSchema,
  type OwnerRateState, type PriceWindow, type PublicPriceEstimate, type QuoteBreakdown } from "@/types/pricing";

export class PricingError extends Error {}
export async function requirePricingOwner(client: BookingDbClient): Promise<void> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new PricingError("OWNER authorization required.");
  const { data, error } = await client.rpc("is_ten29_owner");
  if (error || data !== true) throw new PricingError("OWNER authorization required.");
}
function fail(error: { code?: string; message?: string } | null): never {
  const safe = ["Rates changed; reload before saving", "Rates changed; reload before publishing", "Rates changed; review the current estimate",
    "Missing nightly rate; request an owner quote", "Request is not eligible for a new quote", "Owner-approved payment terms are required"];
  throw new PricingError(error?.code === "23P01" || error?.code === "23505"
    ? "Conflicting rule or duplicate operation. Reload and review the affected dates."
    : safe.includes(error?.message ?? "") ? error!.message! : "Pricing operation was rejected. Review the inputs and try again.");
}
export async function readOwnerRates(client: BookingDbClient, packageCode: BookingPackageCode): Promise<OwnerRateState> {
  await requirePricingOwner(client);
  z.enum(BOOKING_PACKAGE_CODES).parse(packageCode);
  const { data, error } = await client.rpc("read_owner_rate_state", { p_package: packageCode });
  if (error || !data) fail(error);
  return data;
}
export async function saveRateDraft(client: BookingDbClient, raw: z.infer<typeof saveRateDraftSchema>): Promise<string> {
  await requirePricingOwner(client);
  const input = saveRateDraftSchema.safeParse(raw);
  if (!input.success) throw new PricingError(input.error.issues[0]?.message ?? "Invalid rate draft.");
  const { data, error } = await client.rpc("save_calendar_rate_draft", { p_package: input.data.package_code,
    p_base: input.data.base_revision_id, p_rules: input.data.rules, p_key: input.data.idempotency_key });
  if (error || !data) fail(error);
  return data;
}
export async function publishRateDraft(client: BookingDbClient, raw: z.infer<typeof publishRateSchema>): Promise<string> {
  await requirePricingOwner(client);
  const input = publishRateSchema.safeParse(raw);
  if (!input.success) throw new PricingError("Review and confirm the publication first.");
  const { data, error } = await client.rpc("publish_calendar_rate_revision", { p_revision: input.data.revision_id,
    p_base: input.data.base_revision_id, p_key: input.data.idempotency_key });
  if (error || !data) fail(error);
  return data;
}
export async function readPublicPrices(client: BookingDbClient, raw: PriceWindow): Promise<PublicPriceEstimate> {
  const input = priceWindowSchema.safeParse(raw);
  if (!input.success) throw new PricingError(input.error.issues[0]?.message ?? "Invalid price window.");
  const { data, error } = await client.rpc("read_public_calendar_prices", { p_package: input.data.package_code,
    p_from: input.data.check_in_date, p_to: input.data.check_out_date,
    p_guests: input.data.overnight_guest_count, p_foams: input.data.folding_foams_requested });
  if (error || !data) fail(error);
  // Explicit public projection; never spread database/private booking records.
  return { ...input.data, bedrooms_opened: data.bedrooms_opened, private_whole_house: true, currency: "PHP",
    estimate_kind: "ACCOMMODATION_ONLY", version: data.version, missing_rates: data.missing_rates,
    accommodation_subtotal_centavos: data.accommodation_subtotal_centavos, estimated_total_centavos: data.estimated_total_centavos,
    nights: data.nights.map((n) => ({ date: n.date, package_code: input.data.package_code,
      amount_centavos: n.amount_centavos, source: n.source, rate_revision_id: n.rate_revision_id })) };
}
export async function revalidatePriceEstimate(client: BookingDbClient, raw: PriceWindow, expectedVersion: string | null) {
  z.string().uuid().nullable().parse(expectedVersion);
  const current = await readPublicPrices(client, raw);
  return { changed: current.version !== expectedVersion, acknowledgement_required: current.version !== expectedVersion, current_estimate: current };
}
// Owner-only foundation API. It approves the supplied booking-specific arrangements
// as a new snapshot; no client approval flags or aggregate totals are accepted.
export async function prepareItemizedQuote(client: BookingDbClient, raw: z.infer<typeof prepareQuoteSchema>): Promise<string> {
  await requirePricingOwner(client);
  const input = prepareQuoteSchema.safeParse(raw);
  if (!input.success) throw new PricingError("Invalid itemized quotation.");
  const p = input.data;
  const { data, error } = await client.rpc("prepare_itemized_booking_quote", { p_request: p.request_id,
    p_expected_rate: p.expected_rate_revision_id, p_deposit: p.required_down_payment_centavos, p_adjustments: p.adjustments,
    p_manual_nights: p.manual_nights, p_security_deposit: p.refundable_security_deposit_centavos,
    p_conditions: p.conditions, p_valid_until: p.valid_until, p_key: p.idempotency_key });
  if (error || !data) fail(error);
  return data;
}
export async function issueItemizedQuote(client: BookingDbClient, quoteId: string): Promise<string> {
  await requirePricingOwner(client);
  z.string().uuid().parse(quoteId);
  const { data, error } = await client.rpc("issue_itemized_booking_quote", { p_quote: quoteId });
  if (error || !data) fail(error);
  return data;
}
export async function readQuoteBreakdown(client: BookingDbClient, quoteId: string): Promise<QuoteBreakdown> {
  await requirePricingOwner(client);
  z.string().uuid().parse(quoteId);
  const { data, error } = await client.rpc("read_owner_quote_breakdown", { p_quote: quoteId });
  if (error || !data) fail(error);
  return data;
}
