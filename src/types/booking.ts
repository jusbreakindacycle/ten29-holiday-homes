import { z } from "zod";

export const BOOKING_PACKAGE_CODES = [
  "WHOLE_HOME_1BR",
  "WHOLE_HOME_2BR",
  "WHOLE_HOME_3BR",
] as const;

export type BookingPackageCode = (typeof BOOKING_PACKAGE_CODES)[number];

export interface BookingPackageRecommendation {
  packageCode: BookingPackageCode;
  foldingFoamsRequested: boolean;
}

export function recommendBookingPackage(overnightGuestCount: number): BookingPackageRecommendation | null {
  if (!Number.isInteger(overnightGuestCount) || overnightGuestCount < 1 || overnightGuestCount > 8) {
    return null;
  }
  if (overnightGuestCount <= 2) {
    return { packageCode: "WHOLE_HOME_1BR", foldingFoamsRequested: false };
  }
  if (overnightGuestCount <= 4) {
    return { packageCode: "WHOLE_HOME_2BR", foldingFoamsRequested: false };
  }
  return {
    packageCode: "WHOLE_HOME_3BR",
    foldingFoamsRequested: overnightGuestCount > 6,
  };
}

export const BOOKING_REQUEST_SOURCES = [
  "WEBSITE",
  "MESSENGER",
  "PHONE",
  "WALK_IN",
  "EXTERNAL_PLATFORM",
  "OTHER",
] as const;

export type BookingRequestSource = (typeof BOOKING_REQUEST_SOURCES)[number];

export const BOOKING_REQUEST_STATUSES = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "AWAITING_DEPOSIT",
  "DECLINED",
  "WITHDRAWN",
  "EXPIRED",
] as const;

export type BookingRequestStatus = (typeof BOOKING_REQUEST_STATUSES)[number];

export const BOOKING_DEPOSIT_STATUSES = ["RECORDED_UNVERIFIED", "VERIFIED", "REJECTED"] as const;
export type BookingDepositStatus = (typeof BOOKING_DEPOSIT_STATUSES)[number];

export const RESERVATION_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ALLOWED_BOOKING_REQUEST_TRANSITIONS: Record<
  BookingRequestStatus,
  readonly BookingRequestStatus[]
> = {
  NEW: ["REVIEWING", "DECLINED", "WITHDRAWN", "EXPIRED"],
  REVIEWING: ["QUOTED", "DECLINED", "WITHDRAWN", "EXPIRED"],
  QUOTED: ["AWAITING_DEPOSIT", "DECLINED", "WITHDRAWN", "EXPIRED"],
  AWAITING_DEPOSIT: ["QUOTED", "DECLINED", "WITHDRAWN", "EXPIRED"],
  DECLINED: [],
  WITHDRAWN: [],
  EXPIRED: [],
};

export function isValidBookingRequestTransition(
  from: BookingRequestStatus,
  to: BookingRequestStatus
): boolean {
  return from === to || ALLOWED_BOOKING_REQUEST_TRANSITIONS[from].includes(to);
}

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid local calendar date.");

export const createBookingRequestSchema = z
  .object({
    inquiry_id: z.string().uuid().nullable().optional(),
    source: z.enum(BOOKING_REQUEST_SOURCES),
    package_code: z.enum(BOOKING_PACKAGE_CODES),
    check_in_date: localDate,
    check_out_date: localDate,
    overnight_guest_count: z.number().int().min(1).max(8),
    folding_foams_requested: z.boolean().default(false),
    idempotency_key: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.check_out_date <= value.check_in_date) {
      context.addIssue({
        code: "custom",
        path: ["check_out_date"],
        message: "Check-out date must be after check-in date.",
      });
    }
    if (value.source === "WEBSITE" && !value.inquiry_id) {
      context.addIssue({
        code: "custom",
        path: ["inquiry_id"],
        message: "Website booking requests must link to an enquiry.",
      });
    }
    if (value.source !== "WEBSITE" && value.inquiry_id) {
      context.addIssue({
        code: "custom",
        path: ["inquiry_id"],
        message: "Manual booking requests must not attach an unrelated website enquiry.",
      });
    }
    const maximumGuests = value.package_code === "WHOLE_HOME_1BR"
      ? 2
      : value.package_code === "WHOLE_HOME_2BR"
        ? 4
        : value.folding_foams_requested ? 8 : 6;
    if (value.overnight_guest_count > maximumGuests) {
      context.addIssue({
        code: "custom",
        path: ["overnight_guest_count"],
        message: value.overnight_guest_count > 6 && value.package_code === "WHOLE_HOME_3BR"
          ? "Select the 3-bedroom folding-foam option for 7–8 overnight guests."
          : "Overnight guest count exceeds this package capacity.",
      });
    }
    if (value.folding_foams_requested && value.package_code !== "WHOLE_HOME_3BR") {
      context.addIssue({
        code: "custom",
        path: ["folding_foams_requested"],
        message: "Additional folding foams are an option within the 3-bedroom package only.",
      });
    }
  });

export type CreateBookingRequestInput = z.infer<typeof createBookingRequestSchema>;

export const createBookingQuoteDraftSchema = z
  .object({
    request_id: z.string().uuid(),
    revision: z.number().int().positive(),
    amount_total: z.number().finite().nonnegative().nullable().default(null),
    required_deposit_amount: z.number().finite().nonnegative().nullable().default(null),
    valid_until: z.string().datetime({ offset: true }).nullable().default(null),
    line_items: z.array(z.record(z.string(), z.unknown())).default([]),
    idempotency_key: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.amount_total !== null &&
      value.required_deposit_amount !== null &&
      value.required_deposit_amount > value.amount_total
    ) {
      context.addIssue({
        code: "custom",
        path: ["required_deposit_amount"],
        message: "Required deposit cannot exceed the quote total.",
      });
    }
  });

export type CreateBookingQuoteDraftInput = z.input<typeof createBookingQuoteDraftSchema>;

export const recordBookingDepositSchema = z
  .object({
    request_id: z.string().uuid(),
    amount: z.number().finite().positive(),
    payment_method: z.string().trim().max(40).nullable().optional(),
    external_reference_masked: z.string().trim().max(80)
      .refine((value) => !/[0-9]{5,}/.test(value), "Store only a masked payment reference.")
      .nullable().optional(),
    idempotency_key: z.string().uuid().optional(),
  })
  .strict();

export type RecordBookingDepositInput = z.infer<typeof recordBookingDepositSchema>;

export type BookingRequest = {
  id: string;
  idempotency_key: string | null;
  inquiry_id: string | null;
  property_id: number;
  package_code: BookingPackageCode;
  source: BookingRequestSource;
  check_in_date: string;
  check_out_date: string;
  overnight_guest_count: number | null;
  folding_foams_requested: boolean;
  status: BookingRequestStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingQuote = {
  id: string;
  idempotency_key: string | null;
  request_id: string;
  revision: number;
  status: "DRAFT" | "ISSUED";
  currency: string;
  amount_total: number | null;
  required_deposit_amount: number | null;
  valid_until: string | null;
  line_items: Array<Record<string, unknown>>;
  owner_approved_by: string | null;
  owner_approved_at: string | null;
  issued_by: string | null;
  issued_at: string | null;
  created_by: string;
  created_at: string;
};

export type BookingDeposit = {
  id: string;
  idempotency_key: string | null;
  request_id: string;
  amount: number;
  payment_method: string | null;
  external_reference_masked: string | null;
  status: BookingDepositStatus;
  recorded_by: string;
  recorded_at: string;
  verified_by: string | null;
  verified_at: string | null;
};

export type BookingRequestEvent = {
  id: string;
  request_id: string;
  previous_status: BookingRequestStatus | null;
  new_status: BookingRequestStatus;
  actor_id: string | null;
  created_at: string;
};

export type BookingReservation = {
  id: string;
  request_id: string;
  status: ReservationStatus;
  created_by: string;
  confirmed_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key: string | null;
  quote_id: string | null;
  property_id: number | null;
  package_code: BookingPackageCode | null;
  check_in_date: string | null;
  check_out_date: string | null;
  overnight_guest_count: number | null;
  folding_foams_requested: boolean | null;
  verified_deposit_total: number | null;
};

export const decideBookingDepositSchema = z.object({
  deposit_id: z.string().uuid(),
  decision: z.enum(["VERIFIED", "REJECTED"]),
  independently_verified: z.boolean(),
  idempotency_key: z.string().uuid(),
}).strict().refine((value) => value.decision !== "VERIFIED" || value.independently_verified, {
  message: "Independently verify receipt of funds before verifying a deposit.",
  path: ["independently_verified"],
});
export type DecideBookingDepositInput = z.infer<typeof decideBookingDepositSchema>;

export const confirmBookingReservationSchema = z.object({
  request_id: z.string().uuid(),
  quote_id: z.string().uuid(),
  idempotency_key: z.string().uuid(),
}).strict();
export type ConfirmBookingReservationInput = z.infer<typeof confirmBookingReservationSchema>;

export const bookingAvailabilitySchema = z.object({
  check_in_date: localDate,
  check_out_date: localDate,
}).strict().refine((value) => {
  const nights = (Date.parse(value.check_out_date) - Date.parse(value.check_in_date)) / 86400000;
  // ISO date-only ordinals; operating clock times never enter this calculation.
  return nights >= 1 && nights <= 366;
}, "Availability window must be between 1 and 366 nights.");
export type BookingAvailabilityInput = z.infer<typeof bookingAvailabilitySchema>;
export type PublicBookingUnavailableSpan = BookingAvailabilityInput;
export const createBookingOwnerBlockSchema = z.object({
  check_in_date: localDate,
  check_out_date: localDate,
  idempotency_key: z.string().uuid(),
}).strict().refine((value) => value.check_out_date > value.check_in_date, "Check-out must be after check-in.");
export type CreateBookingOwnerBlockInput = z.infer<typeof createBookingOwnerBlockSchema>;
