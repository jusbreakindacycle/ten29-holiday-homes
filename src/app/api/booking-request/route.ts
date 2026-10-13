import { cookies } from "next/headers";
import { after } from "next/server";
import { acceptGuestBooking, deliverBookingNotifications, GuestBookingError } from "@/services/guest-booking-service";
import { BOOKING_COOKIE, bookingHash, validBookingSession } from "@/lib/booking-session";
import { isBookingSameOrigin } from "@/lib/booking-origin";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function POST(request: Request) {
  if (!isBookingSameOrigin(request) || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return Response.json({ error: "Reload this page before submitting." }, { status: 403, headers });
  try {
    const session = (await cookies()).get(BOOKING_COOKIE)?.value;
    if (!validBookingSession(session)) return Response.json({ error: "Reload to start a secure request session." }, { status: 403, headers });
    const reader = request.body?.getReader(); let body = ""; let size = 0;
    if (!reader) return Response.json({ error: "Missing request." }, { status: 400, headers });
    const decoder = new TextDecoder();
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
      if (size > 196608) { await reader.cancel(); return Response.json({ error: "Request too large." }, { status: 413, headers }); }
      body += decoder.decode(part.value, { stream: true }); }
    body += decoder.decode();
    const raw = JSON.parse(body);
    // Contact quota plus signed session quota; client-forwarded IP addresses have no authority.
    const result = await acceptGuestBooking(raw, bookingHash(session), bookingHash(String(raw.mobile_number).replace(/\D/g, "")));
    if (result.outcome === "SAVED") {
      const { request_id, ...receipt } = result;
      after(async () => { try { await deliverBookingNotifications(request_id); } catch { /* Durable task remains pending. */ } });
      return Response.json(receipt, { headers });
    }
    return Response.json(result, { status: result.outcome === "RATE_LIMITED" ? 429 : 409, headers });
  } catch (e) { return Response.json({ error: e instanceof GuestBookingError ? e.message : "Request not saved. Retry or contact TEN29." }, { status: 400, headers }); }
}
