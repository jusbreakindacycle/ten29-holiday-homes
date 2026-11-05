import { describe, expect, it } from "vitest";
import { guestBookingSchema, manilaToday } from "@/types/guest-booking";
import { OWNER_POLICY_VERSION } from "@/types/owner-policy";
import { addDays } from "@/types/pricing";
const input = { idempotency_key: "00000000-0000-4000-8000-000000000091", full_name: "Synthetic Guest", mobile_number: "09171234567", email: "",
  adults: 2, children: 0, day_visitors: 0, vehicles: 0, package_code: "WHOLE_HOME_3BR", folding_foams_requested: false,
  check_in_date: addDays(manilaToday(), 20), check_out_date: addDays(manilaToday(), 22), privacy_consent: true,
  message: "", purpose_of_stay: "", utm_source: "", utm_medium: "", utm_campaign: "", website: "" };
describe("public booking contract", () => {
  it("keeps a chosen larger package without inventing fees", () => { expect(guestBookingSchema.parse(input).package_code).toBe("WHOLE_HOME_3BR"); });
  it("assigns the current policy when omitted and rejects legacy or unsupported client versions", () => {
    expect(guestBookingSchema.parse(input).policy_version).toBe(OWNER_POLICY_VERSION);
    for (const policy_version of ["LEGACY", "TEN29-unsupported"])
      expect(guestBookingSchema.safeParse({ ...input, policy_version }).success).toBe(false);
  });
  it("counts all overnight people and requires additional bedding for seven/eight", () => {
    expect(guestBookingSchema.safeParse({ ...input, adults: 6, children: 2 }).success).toBe(false);
    expect(guestBookingSchema.safeParse({ ...input, adults: 6, children: 2, folding_foams_requested: true }).success).toBe(true);
    expect(guestBookingSchema.safeParse({ ...input, adults: 7, children: 2, folding_foams_requested: true }).success).toBe(false);
  });
  it("rejects folding foams on 1BR and 2BR guest requests while allowing extra countable guests without foams", () => {
    const policy = { policy_version: OWNER_POLICY_VERSION, young_children: 0 };
    expect(guestBookingSchema.safeParse({
      ...input, ...policy, package_code: "WHOLE_HOME_1BR", adults: 2, children: 1, folding_foams_requested: false,
    }).success).toBe(true);
    expect(guestBookingSchema.safeParse({
      ...input, ...policy, package_code: "WHOLE_HOME_1BR", folding_foams_requested: true,
    }).success).toBe(false);
    expect(guestBookingSchema.safeParse({
      ...input, ...policy, package_code: "WHOLE_HOME_2BR", adults: 4, folding_foams_requested: true,
    }).success).toBe(false);
    expect(guestBookingSchema.safeParse({
      ...input, ...policy, package_code: "WHOLE_HOME_3BR", adults: 7, folding_foams_requested: true,
    }).success).toBe(true);
  });
  it("validates eight countable guests separately from an exempt overnight child", () => {
    const result = guestBookingSchema.safeParse({
      ...input, adults: 7, children: 1, young_children: 1, package_code: "WHOLE_HOME_3BR", folding_foams_requested: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policy_version).toBe(OWNER_POLICY_VERSION);
      expect(result.data.adults + result.data.children).toBe(8);
      expect(result.data.adults + result.data.children + result.data.young_children).toBe(9);
    }
  });
  it("rejects mass assignment, forged consent, undersized packages and malformed dates", () => {
    for (const patch of [{ status: "CONFIRMED" }, { source: "PHONE" }, { paid: true }, { reviewed_estimate: { estimated_total_centavos: 1 } }, { privacy_consent: "false" },
      { adults: 4, package_code: "WHOLE_HOME_1BR" }, { check_out_date: input.check_in_date }, { check_in_date: "2026-02-30" }])
      expect(guestBookingSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("keeps visitor/vehicle information separate without a physical allowance promise", () => {
    expect(guestBookingSchema.safeParse({ ...input, day_visitors: 12, vehicles: 6 }).success).toBe(true);
  });
  it("requires exactly 11 local Philippine digits beginning with 09", () => {
    for (const number of ["09558499239", "09171234567"]) expect(guestBookingSchema.safeParse({ ...input, mobile_number: number }).success).toBe(true);
    for (const number of ["0912345678", "091234567890", "09abc456789", "19123456789", "+639171234567", "09 171234567", "09-171234567"])
      expect(guestBookingSchema.safeParse({ ...input, mobile_number: number }).success).toBe(false);
  });
});
