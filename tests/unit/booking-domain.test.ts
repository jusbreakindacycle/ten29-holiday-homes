import { describe, expect, it } from "vitest";
import {
  BOOKING_PACKAGE_CODES,
  BOOKING_REQUEST_STATUSES,
  createBookingQuoteDraftSchema,
  createBookingRequestSchema,
  isValidBookingRequestTransition,
  recordBookingDepositSchema,
} from "@/types/booking";

const REQUEST_ID = "00000000-0000-4000-8000-000000000001";
const IDEMPOTENCY_KEY = "00000000-0000-4000-8000-000000000002";

describe("booking package and request domain", () => {
  it("exposes only the three whole-home bedroom-access package identifiers", () => {
    expect(BOOKING_PACKAGE_CODES).toEqual([
      "WHOLE_HOME_1BR",
      "WHOLE_HOME_2BR",
      "WHOLE_HOME_3BR",
    ]);
  });

  it("accepts valid Philippine local-date request ranges and manual sources", () => {
    expect(createBookingRequestSchema.safeParse({
      source: "MESSENGER",
      package_code: "WHOLE_HOME_2BR",
      check_in_date: "2027-02-28",
      check_out_date: "2027-03-01",
    }).success).toBe(true);
  });

  it.each([
    { check_in_date: "2027-02-30", check_out_date: "2027-03-01" },
    { check_in_date: "2027-03-02", check_out_date: "2027-03-01" },
  ])("rejects invalid or reversed local-date ranges: $check_in_date to $check_out_date", (dates) => {
    expect(createBookingRequestSchema.safeParse({
      source: "PHONE",
      package_code: "WHOLE_HOME_1BR",
      ...dates,
    }).success).toBe(false);
  });

  it("requires website requests to link to an enquiry and rejects client-supplied status", () => {
    expect(createBookingRequestSchema.safeParse({
      source: "WEBSITE",
      package_code: "WHOLE_HOME_1BR",
      check_in_date: "2027-03-01",
      check_out_date: "2027-03-02",
    }).success).toBe(false);

    expect(createBookingRequestSchema.safeParse({
      inquiry_id: REQUEST_ID,
      source: "WEBSITE",
      package_code: "WHOLE_HOME_1BR",
      check_in_date: "2027-03-01",
      check_out_date: "2027-03-02",
      status: "CONFIRMED",
    }).success).toBe(false);
  });

  it("rejects manually attributed requests carrying a website enquiry link", () => {
    expect(createBookingRequestSchema.safeParse({
      inquiry_id: REQUEST_ID,
      source: "MESSENGER",
      package_code: "WHOLE_HOME_1BR",
      check_in_date: "2027-03-01",
      check_out_date: "2027-03-02",
    }).success).toBe(false);
  });
});

describe("booking request state machine", () => {
  it("allows the request lifecycle and terminal outcomes", () => {
    expect(BOOKING_REQUEST_STATUSES).not.toContain("CONFIRMED");
    expect(isValidBookingRequestTransition("NEW", "REVIEWING")).toBe(true);
    expect(isValidBookingRequestTransition("REVIEWING", "QUOTED")).toBe(true);
    expect(isValidBookingRequestTransition("QUOTED", "AWAITING_DEPOSIT")).toBe(true);
    expect(isValidBookingRequestTransition("AWAITING_DEPOSIT", "EXPIRED")).toBe(true);
  });

  it("rejects skipped transitions and all transitions out of terminal states", () => {
    expect(isValidBookingRequestTransition("NEW", "AWAITING_DEPOSIT")).toBe(false);
    expect(isValidBookingRequestTransition("DECLINED", "REVIEWING")).toBe(false);
    expect(isValidBookingRequestTransition("WITHDRAWN", "QUOTED")).toBe(false);
    expect(isValidBookingRequestTransition("EXPIRED", "AWAITING_DEPOSIT")).toBe(false);
  });
});

describe("quote and deposit validation", () => {
  it("allows a quote draft with no fabricated price, deposit, or expiry", () => {
    const parsed = createBookingQuoteDraftSchema.parse({
      request_id: REQUEST_ID,
      revision: 1,
      idempotency_key: IDEMPOTENCY_KEY,
    });
    expect(parsed.amount_total).toBeNull();
    expect(parsed.required_deposit_amount).toBeNull();
    expect(parsed.valid_until).toBeNull();
  });

  it("rejects deposit amounts exceeding a supplied quote total", () => {
    expect(createBookingQuoteDraftSchema.safeParse({
      request_id: REQUEST_ID,
      revision: 1,
      amount_total: 100,
      required_deposit_amount: 101,
    }).success).toBe(false);
  });

  it("accepts positive unverified deposit input but rejects client verification fields", () => {
    expect(recordBookingDepositSchema.safeParse({
      request_id: REQUEST_ID,
      amount: 1,
      external_reference_masked: "****1234",
    }).success).toBe(true);

    expect(recordBookingDepositSchema.safeParse({
      request_id: REQUEST_ID,
      amount: 1,
      status: "VERIFIED",
    }).success).toBe(false);

    expect(recordBookingDepositSchema.safeParse({
      request_id: REQUEST_ID,
      amount: 1,
      external_reference_masked: "1234567890123456",
    }).success).toBe(false);
  });
});