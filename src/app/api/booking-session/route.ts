import { cookies } from "next/headers";
import { BOOKING_COOKIE, newBookingSession, validBookingSession } from "@/lib/booking-session";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const store = await cookies();
    if (!validBookingSession(store.get(BOOKING_COOKIE)?.value)) store.set(BOOKING_COOKIE, newBookingSession(),
      { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"), path: "/", maxAge: 60 * 60 * 24 * 30 });
    return Response.json({ ready: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Booking requests are temporarily unavailable." }, { status: 503 }); }
}
