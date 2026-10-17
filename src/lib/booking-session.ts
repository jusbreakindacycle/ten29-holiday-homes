import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceRoleKey } from "./env";
export const BOOKING_COOKIE = "ten29-booking-session";
export function bookingHash(value: string): string { return createHmac("sha256", getSupabaseServiceRoleKey()).update(value).digest("hex"); }
export function newBookingSession(): string { const nonce = randomBytes(32).toString("hex"); return `${nonce}.${bookingHash(nonce)}`; }
export function validBookingSession(value: string | undefined): value is string {
  if (!value || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value.split(".")[1]), Buffer.from(bookingHash(value.split(".")[0])));
}
