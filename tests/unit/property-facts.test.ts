import { describe, expect, it } from "vitest";
import { CLAIMS, getAllClaims, getOwnerPreviewClaims, getPublicClaim, isPublicClaim } from "@/content/claims";
import { getFaqItems } from "@/content/faq";
import { FALLBACK_COPY, NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getFacebookUrl, getGoogleMapsUrl, getInstagramUrl } from "@/lib/site-config";

// See docs/27_TEN29_OWNER_FACTUAL_CONFIRMATION.md §0 and docs/05_OWNER_APPROVAL_MATRIX.md —
// these tests prove the owner-supplied property description reconciled on 2026-07-28 behaves
// correctly through the public-claim gate, without re-testing the gate mechanism itself
// (see tests/unit/claims.test.ts for that).

describe("FAQ never describes TEN29 as individually rented rooms", () => {
  it("explicitly states the whole house, not per-room rentals", () => {
    const faq = getFaqItems();
    const roomsAnswer = faq.find((item) => /rent the whole house/i.test(item.question));
    expect(roomsAnswer).toBeDefined();
    expect(roomsAnswer?.answer.toLowerCase()).toContain("not rented out as individually booked rooms");
  });
});

describe("unapproved commercial claims remain absent from public output", () => {
  it("no rate, promotion, or capacity claim is publicly renderable", () => {
    for (const claim of getAllClaims()) {
      if (["rate", "promotion", "capacity", "payment", "cancellation"].includes(claim.category)) {
        expect(isPublicClaim(claim)).toBe(false);
      }
    }
  });

  it("maximum safe occupancy and total-person limits stay unresolved and non-public", () => {
    expect(getPublicClaim(CLAIMS.factMaxSafeOccupancy)).toBeUndefined();
  });
});

describe("enquiry is never presented as a reservation", () => {
  it("the rates fallback copy offers a quotation, never a confirmed booking", () => {
    const lower = FALLBACK_COPY.rates.toLowerCase();
    expect(lower).not.toContain("book now");
    expect(lower).not.toContain("reserved");
    expect(lower).not.toContain("confirmed booking");
    expect(lower).toContain("verified quotation");
  });

  it("the non-reservation notice remains explicit", () => {
    expect(NON_RESERVATION_NOTICE.toLowerCase()).toContain("does not place a hold or create a reservation");
  });
});

describe("missing Instagram and active business email do not break public pages", () => {
  it("site-config getters return undefined without throwing when unset", () => {
    expect(() => getInstagramUrl()).not.toThrow();
    expect(() => getFacebookUrl()).not.toThrow();
    expect(() => getGoogleMapsUrl()).not.toThrow();
  });
});

describe("owner preview remains protected and reflects the reconciliation boundary", () => {
  it("no longer lists the newly public owner-approved facts as pending owner review", () => {
    const previewIds = new Set(getOwnerPreviewClaims().map((c) => c.id));
    for (const id of ["CLM-FACT-001", "CLM-FACT-003", "CLM-FACT-030", "CLM-LOC-001"]) {
      expect(previewIds.has(id)).toBe(false);
    }
  });

  it("still lists genuinely unresolved facts for owner review", () => {
    const previewIds = new Set(getOwnerPreviewClaims().map((c) => c.id));
    for (const id of ["CLM-FACT-004", "CLM-FACT-005", "CLM-FACT-015"]) {
      expect(previewIds.has(id)).toBe(true);
    }
  });
});
