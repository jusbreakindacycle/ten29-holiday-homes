import { describe, expect, it } from "vitest";
import {
  CLAIMS,
  getAllClaims,
  getOwnerPreviewClaims,
  getPublicClaim,
  getPublicClaimOrFallback,
  isPublicClaim,
} from "@/content/claims";

describe("isPublicClaim", () => {
  it("allows VERIFIED claims marked public", () => {
    expect(isPublicClaim(CLAIMS.brandName)).toBe(true);
  });

  it("allows APPROVED_FOR_PUBLICATION claims marked public", () => {
    const approved = {
      ...CLAIMS.brandName,
      status: "APPROVED_FOR_PUBLICATION" as const,
    };
    expect(isPublicClaim(approved)).toBe(true);
  });

  it("rejects PROPOSED_PENDING_APPROVAL claims even if allowedSurfaces included public", () => {
    const proposedButFlaggedPublic = {
      ...CLAIMS.rateWeekday,
      allowedSurfaces: ["public" as const],
    };
    expect(isPublicClaim(proposedButFlaggedPublic)).toBe(false);
  });

  it("rejects UNVERIFIED claims", () => {
    expect(isPublicClaim(CLAIMS.factBedrooms)).toBe(false);
  });

  it("rejects a VERIFIED claim that is not marked for public surfaces (e.g. block/lot)", () => {
    expect(CLAIMS.preciseMapRecord.status).toBe("VERIFIED");
    expect(isPublicClaim(CLAIMS.preciseMapRecord)).toBe(false);
  });
});

describe("getPublicClaim / getPublicClaimOrFallback", () => {
  it("returns the value for a public claim", () => {
    expect(getPublicClaim(CLAIMS.phoneDisplay)).toBe("0961 586 8106");
  });

  it("returns undefined for a non-public claim", () => {
    expect(getPublicClaim(CLAIMS.rateWeekday)).toBeUndefined();
  });

  it("falls back to the supplied value for a non-public claim", () => {
    expect(getPublicClaimOrFallback(CLAIMS.rateWeekday, "Request a quote")).toBe(
      "Request a quote"
    );
  });

  it("prefers the real value over the fallback when the claim is public", () => {
    expect(getPublicClaimOrFallback(CLAIMS.brandName, "fallback")).toBe("TEN29 Holiday Homes");
  });
});

describe("claim registry invariants", () => {
  const allClaims = getAllClaims();

  it("has no duplicate claim IDs", () => {
    const ids = allClaims.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never allows a PROPOSED_PENDING_APPROVAL or UNVERIFIED claim onto public surfaces", () => {
    const violations = allClaims.filter(
      (claim) =>
        claim.allowedSurfaces.includes("public") &&
        (claim.status === "PROPOSED_PENDING_APPROVAL" || claim.status === "UNVERIFIED")
    );
    expect(violations).toEqual([]);
  });

  it("requires approvedAt for every VERIFIED or APPROVED_FOR_PUBLICATION claim", () => {
    const missingApproval = allClaims.filter(
      (claim) =>
        (claim.status === "VERIFIED" || claim.status === "APPROVED_FOR_PUBLICATION") &&
        !claim.approvedAt
    );
    expect(missingApproval).toEqual([]);
  });

  it("getOwnerPreviewClaims returns exactly the non-public claims", () => {
    const previewIds = new Set(getOwnerPreviewClaims().map((c) => c.id));
    for (const claim of allClaims) {
      expect(previewIds.has(claim.id)).toBe(!isPublicClaim(claim));
    }
  });

  it("rate, promotion, capacity, payment, and cancellation claims all start non-public", () => {
    const gatedCategories = new Set([
      "rate",
      "promotion",
      "capacity",
      "payment",
      "cancellation",
      "houseRule",
    ]);
    const violations = allClaims.filter(
      (claim) => gatedCategories.has(claim.category) && isPublicClaim(claim)
    );
    expect(violations).toEqual([]);
  });
});
