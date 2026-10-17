import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPublicPrices } from "@/services/pricing-service";
import { priceWindowSchema } from "@/types/pricing";
import { operationalLog } from "@/lib/operational-log";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function GET(request: Request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const input = priceWindowSchema.safeParse({ ...q, overnight_guest_count: Number(q.overnight_guest_count), folding_foams_requested: q.folding_foams_requested === "true" });
  if (!input.success || !["true", "false"].includes(q.folding_foams_requested)) return Response.json({ error: "Invalid calendar selection." }, { status: 400, headers });
  let stage: 'configuration' | 'pricing' | 'availability' | 'response' = 'configuration';
  try {
    const client = await createSupabaseServerClient();
    stage = 'pricing';
    const estimate = await readPublicPrices(client, input.data);
    stage = 'availability';
    const availability = await client.rpc("read_booking_availability", {
      p_check_in: input.data.check_in_date,
      p_check_out: input.data.check_out_date,
    });
    if (availability.error) {
      operationalLog('booking_calendar_failed', { stage, providerCode: availability.error.code });
      return Response.json({ error: "Calendar unavailable. Retry before requesting your dates.", diagnostic_code: "AVAILABILITY_UNAVAILABLE" }, { status: 503, headers });
    }
    stage = 'response';
    if (!Array.isArray(availability.data) || availability.data.some(row =>
      !row || typeof row.check_in_date !== 'string' || typeof row.check_out_date !== 'string')) {
      operationalLog('booking_calendar_failed', { stage });
      return Response.json({ error: "Calendar response was incomplete. Retry before requesting your dates.", diagnostic_code: "CALENDAR_RESPONSE_INVALID" }, { status: 503, headers });
    }
    return Response.json({ estimate, unavailable: availability.data.map(v => ({ check_in_date: v.check_in_date, check_out_date: v.check_out_date })) }, { headers });
  } catch {
    operationalLog('booking_calendar_failed', { stage });
    const diagnostic_code = stage === 'configuration' ? 'CALENDAR_CONFIGURATION' : stage === 'pricing' ? 'PRICING_UNAVAILABLE' : 'CALENDAR_UNAVAILABLE';
    return Response.json({ error: "Calendar unavailable. Retry before requesting your dates.", diagnostic_code }, { status: 503, headers });
  }
}
