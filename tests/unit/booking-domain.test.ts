import { describe, expect, it } from "vitest";
import {
  BOOKING_PACKAGE_CODES,
  BOOKING_REQUEST_STATUSES,
  createBookingQuoteDraftSchema,
  createBookingRequestSchema,
  isValidBookingRequestTransition,
  recommendBookingPackage,
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
      overnight_guest_count: 4,
    }).success).toBe(true);
  });

  it.each([
    ["WHOLE_HOME_1BR", 2, false],
    ["WHOLE_HOME_2BR", 4, false],
    ["WHOLE_HOME_3BR", 6, false],
    ["WHOLE_HOME_3BR", 8, true],
  ] as const)("accepts %s for %s overnight guests (foam option: %s)", (package_code, overnight_guest_count, folding_foams_requested) => {
    expect(createBookingRequestSchema.safeParse({
      source: "PHONE",
      package_code,
      check_in_date: "2027-06-10",
      check_out_date: "2027-06-11",
      overnight_guest_count,
      folding_foams_requested,
    }).success).toBe(true);
  });

  it.each([
    ["WHOLE_HOME_1BR", 3, false],
    ["WHOLE_HOME_2BR", 5, false],
    ["WHOLE_HOME_3BR", 7, false],
    ["WHOLE_HOME_3BR", 9, true],
    ["WHOLE_HOME_2BR", 4, true],
  ] as const)("rejects over-capacity or misplaced foam option: %s, %s guests, foam=%s", (package_code, overnight_guest_count, folding_foams_requested) => {
    expect(createBookingRequestSchema.safeParse({
      source: "PHONE",
      package_code,
      check_in_date: "2027-06-10",
      check_out_date: "2027-06-11",
      overnight_guest_count,
      folding_foams_requested,
    }).success).toBe(false);
  });

  it("recommends package access from the total overnight guest count", () => {
    expect(recommendBookingPackage(1)).toEqual({ packageCode: "WHOLE_HOME_1BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(2)).toEqual({ packageCode: "WHOLE_HOME_1BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(3)).toEqual({ packageCode: "WHOLE_HOME_2BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(4)).toEqual({ packageCode: "WHOLE_HOME_2BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(5)).toEqual({ packageCode: "WHOLE_HOME_3BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(6)).toEqual({ packageCode: "WHOLE_HOME_3BR", foldingFoamsRequested: false });
    expect(recommendBookingPackage(7)).toEqual({ packageCode: "WHOLE_HOME_3BR", foldingFoamsRequested: true });
    expect(recommendBookingPackage(8)).toEqual({ packageCode: "WHOLE_HOME_3BR", foldingFoamsRequested: true });
    expect(recommendBookingPackage(9)).toBeNull();
  });

  it.each([
    [1, ["WHOLE_HOME_1BR", "WHOLE_HOME_2BR", "WHOLE_HOME_3BR"]],
    [2, ["WHOLE_HOME_1BR", "WHOLE_HOME_2BR", "WHOLE_HOME_3BR"]],
    [3, ["WHOLE_HOME_2BR", "WHOLE_HOME_3BR"]],
    [4, ["WHOLE_HOME_2BR", "WHOLE_HOME_3BR"]],
    [5, ["WHOLE_HOME_3BR"]],
    [6, ["WHOLE_HOME_3BR"]],
    [7, []],
    [8, []],
    [9, []],
  ] as const)(
    "validates every package independently of the recommendation for %s guests",
    (overnight_guest_count, eligibleWithoutFoams) => {
      for (const package_code of BOOKING_PACKAGE_CODES) {
        for (const folding_foams_requested of [false, true]) {
          const eligible = folding_foams_requested
            ? package_code === "WHOLE_HOME_3BR" && overnight_guest_count <= 8
            : (eligibleWithoutFoams as readonly string[]).includes(package_code);
          const result = createBookingRequestSchema.safeParse({
            source: "PHONE",
            package_code,
            check_in_date: "2027-06-10",
            check_out_date: "2027-06-11",
            overnight_guest_count,
            folding_foams_requested,
          });
          expect(result.success).toBe(eligible);
          if (result.success) expect(result.data.package_code).toBe(package_code);
        }
      }
    }
  );

  it.each([
    { check_in_date: "2027-02-30", check_out_date: "2027-03-01" },
    { check_in_date: "2027-03-02", check_out_date: "2027-03-01" },
  ])("rejects invalid or reversed local-date ranges: $check_in_date to $check_out_date", (dates) => {
    expect(createBookingRequestSchema.safeParse({
      source: "PHONE",
      package_code: "WHOLE_HOME_1BR",
      ...dates,
      overnight_guest_count: 2,
    }).success).toBe(false);
  });

  it("requires website requests to link to an enquiry and rejects client-supplied status", () => {
    expect(createBookingRequestSchema.safeParse({
      source: "WEBSITE",
      package_code: "WHOLE_HOME_1BR",
      check_in_date: "2027-03-01",
      check_out_date: "2027-03-02",
      overnight_guest_count: 2,
    }).success).toBe(false);

    expect(createBookingRequestSchema.safeParse({
      inquiry_id: REQUEST_ID,
      source: "WEBSITE",
      package_code: "WHOLE_HOME_1BR",
      check_in_date: "2027-03-01",
      check_out_date: "2027-03-02",
      overnight_guest_count: 2,
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
      overnight_guest_count: 1,
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
