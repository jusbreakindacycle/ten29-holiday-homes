import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePriceEstimate } from "@/services/pricing-service";
import { priceWindowSchema } from "@/types/pricing";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
const schema = z.object({ selection: priceWindowSchema, expected_version: z.string().uuid().nullable() }).strict();
// Read-only foundation: discloses stale estimates; never creates/confirms a booking.
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 4096) return Response.json({ error: "Selection too large." }, { status: 413, headers });
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid estimate selection." }, { status: 400, headers });
    const result = await revalidatePriceEstimate(await createSupabaseServerClient(), parsed.data.selection, parsed.data.expected_version);
    return Response.json(result, { status: result.changed ? 409 : 200, headers });
  } catch { return Response.json({ error: "Could not revalidate the estimate. Request a quote." }, { status: 503, headers }); }
}
