import { describe, expect, it, vi } from "vitest";
import {
  confirmBookingReservation, createBookingOwnerBlock, decideBookingDeposit,
  readBookingAvailability, releaseBookingOwnerBlock, type BookingDbClient,
} from "@/services/booking-service";

const requestId = "00000000-0000-4000-8000-000000000091";
const quoteId = "00000000-0000-4000-8000-000000000092";
const key = "00000000-0000-4000-8000-000000000093";
const input = { request_id: requestId, quote_id: quoteId, idempotency_key: key };
function fixture(owner = true, admin = true) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_ten29_admin") return { data: admin, error: null };
    if (name === "is_ten29_owner") return { data: owner, error: null };
    return { data: requestId as unknown, error: null as { code: string; message: string } | null };
  });
  const db = { rpc, auth: { getUser: vi.fn(async () => ({ data: { user: { id: requestId } }, error: null })) } };
  return { db: db as unknown as BookingDbClient, rpc };
}
describe("Slice 3 owner operations", () => {
  it.each([[false, true], [false, false]])("denies non-owner authority (%s, admin=%s) before invoking confirmation", async (owner, admin) => {
    const { db, rpc } = fixture(owner, admin);
    await expect(confirmBookingReservation(db, input)).rejects.toThrow();
    expect(rpc.mock.calls.some(([name]) => name === "confirm_booking_reservation")).toBe(false);
  });
  it("rejects forged paid/status/amount authority rather than forwarding it", async () => {
    const { db, rpc } = fixture();
    await expect(confirmBookingReservation(db, { ...input, paid: true, amount: 1, status: "CONFIRMED" } as typeof input)).rejects.toThrow("Invalid reservation confirmation");
    expect(rpc.mock.calls.some(([name]) => name === "confirm_booking_reservation")).toBe(false);
  });
  it("forwards only identifiers to the atomic confirmation RPC", async () => {
    const { db, rpc } = fixture();
    expect(await confirmBookingReservation(db, input)).toBe(requestId);
    expect(rpc).toHaveBeenLastCalledWith("confirm_booking_reservation", {
      p_request_id: requestId, p_quote_id: quoteId, p_idempotency_key: key,
    });
  });
  it("does not report confirmation when database conflict occurs or leak database detail", async () => {
    const { db, rpc } = fixture();
    rpc.mockImplementation(async (name) => name.startsWith("is_")
      ? { data: true, error: null }
      : { data: null, error: { code: "23P01", message: "private receipt details" } });
    await expect(confirmBookingReservation(db, input)).rejects.toThrow("Property dates are unavailable");
  });
  it("requires explicit independent receipt verification and owner authorization", async () => {
    const payment = { deposit_id: requestId, decision: "VERIFIED" as const, independently_verified: false, idempotency_key: key };
    await expect(decideBookingDeposit(fixture().db, payment)).rejects.toThrow("Invalid payment verification decision");
    await expect(decideBookingDeposit(fixture(false).db, { ...payment, independently_verified: true })).rejects.toThrow("owner authorization");
    const { db, rpc } = fixture();
    await decideBookingDeposit(db, { ...payment, independently_verified: true });
    expect(rpc).toHaveBeenLastCalledWith("decide_booking_deposit", {
      p_deposit_id: requestId, p_decision: "VERIFIED", p_independently_verified: true, p_idempotency_key: key,
    });
  });
  it("validates owner blocks and forwards their release through protected RPCs", async () => {
    const { db, rpc } = fixture();
    await expect(createBookingOwnerBlock(db, { check_in_date: "2027-02-30", check_out_date: "2027-03-01", idempotency_key: key })).rejects.toThrow("Invalid owner block");
    await expect(createBookingOwnerBlock(db, { check_in_date: "2027-03-01", check_out_date: "2027-03-01", idempotency_key: key })).rejects.toThrow("Invalid owner block");
    await createBookingOwnerBlock(db, { check_in_date: "2027-12-31", check_out_date: "2028-01-02", idempotency_key: key });
    await releaseBookingOwnerBlock(db, requestId);
    expect(rpc).toHaveBeenLastCalledWith("release_booking_owner_block", { p_block_id: requestId });
  });
});
describe("public coarse availability", () => {
  it("needs no admin authority and strips any unexpected private fields", async () => {
    const { db, rpc } = fixture(false, false);
    rpc.mockResolvedValue({ data: [{ check_in_date: "2027-12-31", check_out_date: "2028-01-02", guest_name: "PRIVATE", payment: 25 }], error: null });
    expect(await readBookingAvailability(db, { check_in_date: "2027-12-30", check_out_date: "2028-01-03" })).toEqual([
      { check_in_date: "2027-12-31", check_out_date: "2028-01-02" },
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["2027-01-01", "2029-01-01"], ["2027-02-30", "2027-03-01"],
    ["2027-03-01", "2027-03-01"], ["2027-03-02", "2027-03-01"],
  ])("rejects unbounded or invalid window %s to %s", async (check_in_date, check_out_date) => {
    const { db, rpc } = fixture();
    await expect(readBookingAvailability(db, { check_in_date, check_out_date })).rejects.toThrow("Invalid availability window");
    expect(rpc).not.toHaveBeenCalled();
  });
});
