import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPublicPrices } from "@/services/pricing-service";
import { priceWindowSchema } from "@/types/pricing";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function GET(request: Request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const input = priceWindowSchema.safeParse({ ...q, overnight_guest_count: Number(q.overnight_guest_count), folding_foams_requested: q.folding_foams_requested === "true" });
  if (!input.success || !["true", "false"].includes(q.folding_foams_requested)) return Response.json({ error: "Invalid calendar selection." }, { status: 400, headers });
  try {
    const client = await createSupabaseServerClient();
    const [estimate, availability] = await Promise.all([readPublicPrices(client, input.data),
      client.rpc("read_booking_availability", { p_check_in: input.data.check_in_date, p_check_out: input.data.check_out_date })]);
    if (availability.error) throw new Error("Unavailable");
    return Response.json({ estimate, unavailable: (availability.data ?? []).map(v => ({ check_in_date: v.check_in_date, check_out_date: v.check_out_date })) }, { headers });
  } catch { return Response.json({ error: "Calendar unavailable. Retry before requesting your dates." }, { status: 503, headers }); }
}
