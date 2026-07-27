import { z } from "zod";

const MAX_DATE_RANGE_MONTHS = 18;
const PH_MOBILE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/;

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date");

/**
 * Shared client/server schema for the booking-enquiry form.
 * `website` is a honeypot field (must stay empty) and `form_rendered_at` is an
 * epoch-ms timestamp used for a lightweight anti-bot timing check — see
 * isLikelySpam() below. Neither is shown to real visitors as a validation error.
 */
export const inquiryFormSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name.").max(120, "That name looks too long."),
    email: z
      .union([z.literal(""), z.string().trim().email("Enter a valid email address.")])
      .optional(),
    mobile_number: z
      .string()
      .trim()
      .min(7, "Enter a valid mobile number.")
      .max(20, "Enter a valid mobile number.")
      .regex(PH_MOBILE_REGEX, "Enter a valid mobile number."),
    check_in_date: dateString,
    check_out_date: dateString,
    adults: z.coerce.number().int().min(1, "At least 1 adult is required.").max(10, "Contact TEN29 directly for larger groups."),
    children: z.coerce.number().int().min(0).max(10).default(0),
    day_visitors: z.coerce.number().int().min(0).max(10).default(0),
    vehicles: z.coerce.number().int().min(0).max(5).default(0),
    purpose_of_stay: z.string().trim().max(200).optional().or(z.literal("")),
    message: z.string().trim().max(1000, "Please keep your message under 1000 characters.").optional().or(z.literal("")),
    privacy_consent: z.coerce.boolean().refine((v) => v === true, "Please confirm you agree to the privacy notice."),
    source: z.string().trim().max(50).optional().default("website"),
    utm_source: z.string().trim().max(100).optional().or(z.literal("")),
    utm_medium: z.string().trim().max(100).optional().or(z.literal("")),
    utm_campaign: z.string().trim().max(100).optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
    form_rendered_at: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    const checkIn = new Date(`${data.check_in_date}T00:00:00`);
    const checkOut = new Date(`${data.check_out_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return;
    }

    if (checkIn < today) {
      ctx.addIssue({
        code: "custom",
        path: ["check_in_date"],
        message: "Check-in date cannot be in the past.",
      });
    }

    if (checkOut <= checkIn) {
      ctx.addIssue({
        code: "custom",
        path: ["check_out_date"],
        message: "Check-out date must be after check-in date.",
      });
    }

    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + MAX_DATE_RANGE_MONTHS);
    if (checkIn > maxDate) {
      ctx.addIssue({
        code: "custom",
        path: ["check_in_date"],
        message: `Requested dates must be within ${MAX_DATE_RANGE_MONTHS} months.`,
      });
    }
  });

export type InquiryFormInput = z.input<typeof inquiryFormSchema>;
export type InquiryFormValues = z.output<typeof inquiryFormSchema>;

export const MIN_SUBMIT_SECONDS = 3;

/** Lightweight anti-bot check: honeypot filled, or submitted implausibly fast. */
export function isLikelySpam(input: { website?: string; form_rendered_at?: number }): boolean {
  if (input.website && input.website.trim().length > 0) return true;
  if (typeof input.form_rendered_at === "number") {
    const elapsedSeconds = (Date.now() - input.form_rendered_at) / 1000;
    if (elapsedSeconds < MIN_SUBMIT_SECONDS) return true;
  }
  return false;
}
