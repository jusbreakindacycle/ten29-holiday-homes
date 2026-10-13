import { describe, expect, it } from "vitest";
import { createFakeSupabaseClient } from "./helpers/fakeSupabaseClient";
import {
  BookingServiceError,
  createBookingQuoteDraft,
  createBookingRequest,
  issueBookingQuote,
  recordUnverifiedBookingDeposit,
  transitionBookingRequest,
  type BookingDbClient,
} from "@/services/booking-service";
import type { BookingRequestStatus } from "@/types/booking";

const REQUEST_KEY = "00000000-0000-4000-8000-000000000010";
const QUOTE_KEY = "00000000-0000-4000-8000-000000000011";
const DEPOSIT_KEY = "00000000-0000-4000-8000-000000000012";

function client() {
  return createFakeSupabaseClient() as unknown as BookingDbClient & {
    _setAdmin(value: boolean): void;
    _setOwner(value: boolean): void;
    _tables: Record<string, Array<Record<string, unknown>>>;
  };
}

const manualRequest = {
  source: "MESSENGER" as const,
  package_code: "WHOLE_HOME_2BR" as const,
  check_in_date: "2027-05-02",
  check_out_date: "2027-05-04",
  overnight_guest_count: 4,
  folding_foams_requested: false,
  idempotency_key: REQUEST_KEY,
};

describe("booking service authorization and lifecycle", () => {
  it("creates an admin-attributed manual request without duplicating guest PII", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);

    expect(request.source).toBe("MESSENGER");
    expect(request.package_code).toBe("WHOLE_HOME_2BR");
    expect(request.status).toBe("NEW");
    expect(request.created_by).toBe("admin-user");
    expect(request).not.toHaveProperty("full_name");
  });

  it("returns the same request for a matching idempotent retry and rejects key reuse", async () => {
    const db = client();
    const first = await createBookingRequest(db, manualRequest);
    const retry = await createBookingRequest(db, manualRequest);
    expect(retry.id).toBe(first.id);
    expect(db._tables.booking_requests).toHaveLength(1);

    await expect(createBookingRequest(db, {
      ...manualRequest,
      package_code: "WHOLE_HOME_3BR",
    })).rejects.toThrow("different request");
  });

  it("rejects a manual request carrying a website enquiry ID", async () => {
    await expect(createBookingRequest(client(), {
      ...manualRequest,
      inquiry_id: "00000000-0000-4000-8000-000000000099",
    })).rejects.toThrow("Invalid booking request");
  });

  it("enforces the selected package capacity server-side, including the 3BR foam option", async () => {
    const db = client();
    const request = await createBookingRequest(db, {
      ...manualRequest,
      package_code: "WHOLE_HOME_3BR",
      overnight_guest_count: 8,
      folding_foams_requested: true,
    });
    expect(request.overnight_guest_count).toBe(8);
    expect(request.folding_foams_requested).toBe(true);

    await expect(createBookingRequest(client(), {
      ...manualRequest,
      package_code: "WHOLE_HOME_1BR",
      overnight_guest_count: 3,
    })).rejects.toThrow("Invalid booking request");
    await expect(createBookingRequest(client(), {
      ...manualRequest,
      package_code: "WHOLE_HOME_3BR",
      overnight_guest_count: 7,
    })).rejects.toThrow("Invalid booking request");
    await expect(createBookingRequest(client(), {
      ...manualRequest,
      package_code: "WHOLE_HOME_3BR",
      overnight_guest_count: 9,
      folding_foams_requested: true,
    })).rejects.toThrow("Invalid booking request");
  });

  it("denies an authenticated account that is not in TEN29 admin membership", async () => {
    const db = client();
    db._setAdmin(false);
    await expect(createBookingRequest(db, manualRequest)).rejects.toThrow(BookingServiceError);
    expect(db._tables.booking_requests).toHaveLength(0);
  });

  it("allows valid transitions but rejects skipped and terminal transitions", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    const reviewing = await transitionBookingRequest(db, request.id, "REVIEWING");
    expect(reviewing.status).toBe("REVIEWING");
    await expect(transitionBookingRequest(db, request.id, "AWAITING_DEPOSIT"))
      .rejects.toThrow("Cannot move a request");
    const declined = await transitionBookingRequest(db, request.id, "DECLINED");
    expect(declined.status).toBe("DECLINED");
    await expect(transitionBookingRequest(db, request.id, "REVIEWING"))
      .rejects.toThrow("Cannot move a request");
  });

  it("rejects forced CONFIRMED status even from an untyped caller", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    await expect(transitionBookingRequest(db, request.id, "CONFIRMED" as BookingRequestStatus))
      .rejects.toThrow("Invalid booking request transition");
  });
});

describe("append-only quote and deposit records", () => {
  it("stores a draft quote with nullable unapproved financial amounts", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    const quote = await createBookingQuoteDraft(db, {
      request_id: request.id,
      revision: 1,
      idempotency_key: QUOTE_KEY,
    });

    expect(quote.status).toBe("DRAFT");
    expect(quote.currency).toBe("PHP");
    expect(quote.amount_total).toBeNull();
    expect(quote.required_deposit_amount).toBeNull();
  });

  it("requires explicit owner membership to issue an approved quote", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    await transitionBookingRequest(db, request.id, "REVIEWING");
    const draft = await createBookingQuoteDraft(db, {
      request_id: request.id,
      revision: 1,
      amount_total: 500,
      required_deposit_amount: 100,
    });

    await expect(issueBookingQuote(db, draft.id)).rejects.toThrow("owner authorization required");
    db._setOwner(true);
    const issued = await issueBookingQuote(db, draft.id);

    expect(issued.status).toBe("ISSUED");
    expect(issued.owner_approved_by).toBe("admin-user");
    expect(db._tables.booking_requests[0].status).toBe("QUOTED");
  });

  it("records only unverified deposits for requests awaiting deposit and preserves idempotency", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    db._tables.booking_requests[0].status = "AWAITING_DEPOSIT";

    const input = {
      request_id: request.id,
      amount: 125,
      payment_method: "bank transfer",
      external_reference_masked: "****1234",
      idempotency_key: DEPOSIT_KEY,
    };
    const deposit = await recordUnverifiedBookingDeposit(db, input);
    const retry = await recordUnverifiedBookingDeposit(db, input);

    expect(deposit.status).toBe("RECORDED_UNVERIFIED");
    expect(deposit.verified_by).toBeNull();
    expect(retry.id).toBe(deposit.id);
    expect(db._tables.booking_deposits).toHaveLength(1);
  });

  it("does not record deposits before the request reaches AWAITING_DEPOSIT", async () => {
    const db = client();
    const request = await createBookingRequest(db, manualRequest);
    await expect(recordUnverifiedBookingDeposit(db, {
      request_id: request.id,
      amount: 125,
    })).rejects.toThrow("awaiting deposit");
    expect(db._tables.booking_deposits).toHaveLength(0);
  });
});