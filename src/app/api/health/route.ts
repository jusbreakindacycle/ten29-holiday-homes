import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  // Liveness only. Dependency readiness belongs behind OWNER authorization.
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
