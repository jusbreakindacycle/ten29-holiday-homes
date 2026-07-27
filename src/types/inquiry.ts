export type InquiryStatus = "NEW" | "REVIEWING" | "CONTACTED" | "CLOSED" | "SPAM";

export const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "CLOSED",
  "SPAM",
];

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface Inquiry {
  id: string;
  reference_code: string;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  full_name: string;
  email: string | null;
  mobile_number: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  day_visitors: number;
  vehicles: number;
  purpose_of_stay: string | null;
  message: string | null;
  privacy_consent: boolean;
  status: InquiryStatus;
  owner_notes: string | null;
  notification_status: NotificationStatus;
  notification_error: string | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  closed_at: string | null;
}

/** Allowed status transitions for admin updates. NEW is the only entry point. */
export const ALLOWED_STATUS_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["REVIEWING", "CONTACTED", "CLOSED", "SPAM"],
  REVIEWING: ["CONTACTED", "CLOSED", "SPAM", "NEW"],
  CONTACTED: ["CLOSED", "REVIEWING", "SPAM"],
  CLOSED: ["REVIEWING"],
  SPAM: ["NEW"],
};

export function isValidStatusTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
