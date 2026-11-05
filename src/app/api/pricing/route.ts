export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function GET() {
  return Response.json({ error: "Standard rates are not publicly available. Request an owner quotation." }, { status: 404, headers });
}
