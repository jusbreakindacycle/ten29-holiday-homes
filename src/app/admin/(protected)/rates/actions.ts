"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readOwnerRates, saveRateDraft, publishRateDraft, readQuoteBreakdown, requirePricingOwner, PricingError } from "@/services/pricing-service";
import { previewRateRules } from "@/lib/pricing";
import { priceWindowSchema, rateRulesSchema, saveRateDraftSchema, publishRateSchema } from "@/types/pricing";
import { BOOKING_PACKAGE_CODES } from "@/types/booking";

async function result<T>(operation: () => Promise<T>): Promise<{ data: T; error?: never } | { error: string; data?: never }> {
  try { return { data: await operation() }; }
  catch (e) { return { error: e instanceof PricingError || e instanceof z.ZodError ? e.message : "Could not complete this operation. Try again." }; }
}
export async function loadRateEditor(packageCode: unknown, offset: unknown = 0) {
  return result(async () => readOwnerRates(await createSupabaseServerClient(), z.enum(BOOKING_PACKAGE_CODES).parse(packageCode), z.number().int().min(0).max(1000000).parse(offset)));
}
export async function saveRateEditor(input: unknown) {
  return result(async () => {
    const client = await createSupabaseServerClient();
    await requirePricingOwner(client);
    return saveRateDraft(client, saveRateDraftSchema.parse(input));
  });
}
export async function previewRateEditor(input: unknown) {
  return result(async () => {
    const client = await createSupabaseServerClient();
    await requirePricingOwner(client);
    const p = z.object({ selection: priceWindowSchema, rules: rateRulesSchema }).strict().parse(input);
    return previewRateRules(p.selection.package_code, p.rules, p.selection.check_in_date, p.selection.check_out_date);
  });
}
export async function publishRateEditor(input: unknown) {
  return result(async () => {
    const id = await publishRateDraft(await createSupabaseServerClient(), publishRateSchema.parse(input));
    revalidatePath("/admin/rates");
    revalidatePath("/api/pricing");
    return id;
  });
}
export async function loadQuotePreview(quoteId: unknown) {
  return result(async () => readQuoteBreakdown(await createSupabaseServerClient(), z.string().uuid().parse(quoteId)));
}
