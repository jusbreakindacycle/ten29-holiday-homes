import { NextResponse } from "next/server";
import { isResendConfigured, isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured(),
    resendConfigured: isResendConfigured(),
  });
}
