import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readOwnerRates, PricingError } from "@/services/pricing-service";
import { RateEditor } from "@/components/features/admin/RateEditor";
import { PromotionEditor } from "@/components/features/admin/PromotionEditor";
import { QuoteBreakdownPreview } from "@/components/features/admin/QuoteBreakdownPreview";
import type { OwnerRateState } from "@/types/pricing";
import type { QuoteChoice } from "@/components/features/admin/QuoteBreakdownPreview";
export const dynamic = "force-dynamic";
export default async function RatesPage() {
  let initial: OwnerRateState | null = null;
  let quotes: QuoteChoice[] = [];
  let message = "";
  try {
    const client = await createSupabaseServerClient();
    initial = await readOwnerRates(client, "WHOLE_HOME_1BR");
    const { data, error } = await client.from("booking_quotes").select("id, revision, status, request_id").order("created_at", { ascending: false }).limit(20);
    if (error) throw new Error("Quote previews unavailable");
    quotes = data ?? [];
  } catch (e) {
    message = e instanceof PricingError ? e.message : "Rate management is unavailable. Reload to retry.";
  }
  if (!initial || message) return <section><h1 className="text-3xl text-forest">Rate Management</h1><p role="alert" className="mt-4">{message}</p></section>;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const month = `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
  return <><h1 className="text-3xl text-forest">Rate Management</h1><p className="mb-6 mt-2 text-muted">Owner-controlled nightly accommodation prices. Private drafts, explicit publication, preserved quotation history.</p>
    <RateEditor initial={initial} initialMonth={month} /><PromotionEditor /><QuoteBreakdownPreview quotes={quotes} /></>;
}
