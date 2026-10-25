import { z } from "zod";
import { OWNER_POLICY_VERSION } from "./owner-policy";
import { BOOKING_PACKAGE_CODES, createBookingRequestSchema } from "./booking";
import { calendarDate, nightDates, type PublicPriceEstimate } from "./pricing";

export function manilaToday(): string {
  const p = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${p.find(v => v.type === "year")!.value}-${p.find(v => v.type === "month")!.value}-${p.find(v => v.type === "day")!.value}`;
}
export const guestBookingSchema = z.object({
  idempotency_key: z.string().uuid(), full_name: z.string().trim().min(2).max(120),
  mobile_number: z.string().regex(/^09[0-9]{9}$/), email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  adults: z.number().int().min(1).max(8), children: z.number().int().min(0).max(7),
  young_children: z.number().int().min(0).max(31).optional(), policy_version: z.literal(OWNER_POLICY_VERSION).optional(),
  day_visitors: z.number().int().min(0).max(32767), vehicles: z.number().int().min(0).max(32767),
  package_code: z.enum(BOOKING_PACKAGE_CODES), folding_foams_requested: z.boolean(),
  check_in_date: calendarDate, check_out_date: calendarDate, privacy_consent: z.literal(true),
  message: z.string().trim().max(1000), purpose_of_stay: z.string().trim().max(200),
  utm_source: z.string().trim().max(100), utm_medium: z.string().trim().max(100), utm_campaign: z.string().trim().max(100),
  website: z.string().max(200),
}).strict().superRefine((v, ctx) => {
  if (!createBookingRequestSchema.safeParse({ source: "PHONE", package_code: v.package_code, check_in_date: v.check_in_date,
    check_out_date: v.check_out_date, overnight_guest_count: v.adults + v.children + (v.young_children ?? 0),
    ...(v.policy_version ? {policy_version:v.policy_version, adults_count:v.adults,older_children_count:v.children,exempt_children_count:v.young_children} : {}), folding_foams_requested: v.folding_foams_requested }).success)
    ctx.addIssue({ code: "custom", message: "Check the overnight count, bedroom package and additional bedding." });
  if (v.young_children !== undefined && !v.policy_version) ctx.addIssue({code:"custom",message:"Age-band counts require policy identity."});
  if (v.check_in_date < manilaToday() || nightDates(v.check_in_date, v.check_out_date).length > 366)
    ctx.addIssue({ code: "custom", message: "Choose valid future dates, up to 366 nights." });
});
export type GuestBookingInput = z.infer<typeof guestBookingSchema>;
export type BookingReceipt = { outcome: "SAVED"; reference_code: string; package_code: GuestBookingInput["package_code"];
  countable_guest_count?:number; exempt_children_count?:number;
  overnight_guest_count: number; folding_foams_requested: boolean; check_in_date: string; check_out_date: string;
  estimate: PublicPriceEstimate; notification_status: "PENDING" };
export type BookingAcknowledgement = Omit<BookingReceipt, "estimate">;
export type IntakeResult = (BookingReceipt & { request_id: string }) | { outcome: "PRICE_CHANGED"; estimate: PublicPriceEstimate }
  | { outcome: "UNAVAILABLE" | "RATE_LIMITED" };
