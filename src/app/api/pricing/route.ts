import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPublicPrices, PricingError } from "@/services/pricing-service";
import { priceWindowSchema } from "@/types/pricing";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  if (params.folding_foams_requested !== undefined && !["true", "false"].includes(params.folding_foams_requested)) {
    return Response.json({ error: "Invalid bedding selection." }, { status: 400, headers });
  }
  const parsed = priceWindowSchema.safeParse({ ...params, overnight_guest_count: Number(params.overnight_guest_count),
    folding_foams_requested: params.folding_foams_requested === "true" });
  if (!parsed.success) return Response.json({ error: "Invalid package, occupancy or date range." }, { status: 400, headers });
  try { return Response.json(await readPublicPrices(await createSupabaseServerClient(), parsed.data), { headers }); }
  catch (e) { return Response.json({ error: e instanceof PricingError ? e.message : "Pricing is temporarily unavailable. Request a quote." }, { status: 503, headers }); }
}
