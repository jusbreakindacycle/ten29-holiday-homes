import { describe, expect, it } from "vitest";
import { guestBookingSchema, manilaToday } from "@/types/guest-booking";
import { addDays } from "@/types/pricing";
const input = { idempotency_key: "00000000-0000-4000-8000-000000000091", full_name: "Synthetic Guest", mobile_number: "+639171234567", email: "",
  adults: 2, children: 0, day_visitors: 0, vehicles: 0, package_code: "WHOLE_HOME_3BR", folding_foams_requested: false,
  check_in_date: addDays(manilaToday(), 20), check_out_date: addDays(manilaToday(), 22), privacy_consent: true,
  message: "", purpose_of_stay: "", utm_source: "", utm_medium: "", utm_campaign: "", website: "", reviewed_estimate: {} };
describe("public booking contract", () => {
  it("keeps a chosen larger package without inventing fees", () => { expect(guestBookingSchema.parse(input).package_code).toBe("WHOLE_HOME_3BR"); });
  it("counts all overnight people and requires additional bedding for seven/eight", () => {
    expect(guestBookingSchema.safeParse({ ...input, adults: 6, children: 2 }).success).toBe(false);
    expect(guestBookingSchema.safeParse({ ...input, adults: 6, children: 2, folding_foams_requested: true }).success).toBe(true);
    expect(guestBookingSchema.safeParse({ ...input, adults: 7, children: 2, folding_foams_requested: true }).success).toBe(false);
  });
  it("rejects mass assignment, forged consent, undersized packages and malformed dates", () => {
    for (const patch of [{ status: "CONFIRMED" }, { source: "PHONE" }, { paid: true }, { privacy_consent: "false" },
      { adults: 4, package_code: "WHOLE_HOME_1BR" }, { check_out_date: input.check_in_date }, { check_in_date: "2026-02-30" }])
      expect(guestBookingSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("keeps visitor/vehicle information separate without a physical allowance promise", () => {
    expect(guestBookingSchema.safeParse({ ...input, day_visitors: 12, vehicles: 6 }).success).toBe(true);
  });
});
