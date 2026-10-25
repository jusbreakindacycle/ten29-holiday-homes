import { createSupabaseServerClient } from "@/lib/supabase/server";
import { operationalLog } from "@/lib/operational-log";
import { readPublicPromotionTeaser, PricingError } from "@/services/pricing-service";
import { BOOKING_PACKAGE_CODES } from "@/types/booking";
import { calendarDate, nightDates } from "@/types/pricing";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  if (!BOOKING_PACKAGE_CODES.includes(query.package_code as typeof BOOKING_PACKAGE_CODES[number])
    || !calendarDate.safeParse(query.check_in_date).success || !calendarDate.safeParse(query.check_out_date).success) {
    return Response.json({ error: "Invalid promotion selection." }, { status: 400, headers });
  }
  const stayNights = nightDates(query.check_in_date!, query.check_out_date!);
  if (!stayNights.length || stayNights.length > 366) return Response.json({ error: "Invalid promotion selection." }, { status: 400, headers });
  try {
    const client = await createSupabaseServerClient();
    const promotion = await readPublicPromotionTeaser(client, {
      package_code: query.package_code as typeof BOOKING_PACKAGE_CODES[number],
      check_in_date: query.check_in_date!, check_out_date: query.check_out_date!,
    });
    return Response.json({ promotion }, { headers });
  } catch (error) {
    operationalLog("promotion_teaser_failed", { stage: error instanceof PricingError ? "pricing" : "configuration",
      providerCode: error instanceof PricingError ? error.providerCode : undefined });
    return Response.json({ error: "Promotion details are unavailable. Request a formal quotation." }, { status: 503, headers });
  }
}
