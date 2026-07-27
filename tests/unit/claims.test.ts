import { describe, expect, it } from "vitest";
import {
  CLAIMS,
  getAllClaims,
  getApprovalStateLabel,
  getOwnerPreviewClaims,
  getPublicClaim,
  getPublicClaimOrFallback,
  getPublicClaims,
  isPublicClaim,
  isStewardApprovedForPrototype,
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

describe("STEWARD_APPROVED_FOR_PROTOTYPE (Project Steward reconciliation)", () => {
  const allClaims = getAllClaims();
  const stewardApprovedClaims = allClaims.filter(
    (claim) => claim.status === "STEWARD_APPROVED_FOR_PROTOTYPE"
  );

  it("reconciles the 11 decision groups (34 claim records) onto the new status", () => {
    expect(stewardApprovedClaims.length).toBe(34);
  });

  it("is never treated as a public status by isPublicClaim, even for a claim flagged public", () => {
    const stewardApprovedButFlaggedPublic = {
      ...CLAIMS.rateWeekday,
      allowedSurfaces: ["public" as const],
    };
    expect(isPublicClaim(stewardApprovedButFlaggedPublic)).toBe(false);
  });

  it("getPublicClaim rejects STEWARD_APPROVED_FOR_PROTOTYPE claims", () => {
    expect(CLAIMS.rateWeekday.status).toBe("STEWARD_APPROVED_FOR_PROTOTYPE");
    expect(getPublicClaim(CLAIMS.rateWeekday)).toBeUndefined();
  });

  it("getPublicClaims never includes a STEWARD_APPROVED_FOR_PROTOTYPE claim", () => {
    const publicIds = new Set(getPublicClaims().map((c) => c.id));
    for (const claim of stewardApprovedClaims) {
      expect(publicIds.has(claim.id)).toBe(false);
    }
  });

  it("getOwnerPreviewClaims includes every STEWARD_APPROVED_FOR_PROTOTYPE claim", () => {
    const previewIds = new Set(getOwnerPreviewClaims().map((c) => c.id));
    for (const claim of stewardApprovedClaims) {
      expect(previewIds.has(claim.id)).toBe(true);
    }
  });

  it("isStewardApprovedForPrototype identifies the status correctly", () => {
    expect(isStewardApprovedForPrototype(CLAIMS.rateWeekday)).toBe(true);
    expect(isStewardApprovedForPrototype(CLAIMS.brandName)).toBe(false);
  });

  it("marks every steward-approved claim as still requiring actual owner confirmation", () => {
    const missingOwnerFlag = stewardApprovedClaims.filter(
      (claim) => claim.ownerVerificationRequired !== true
    );
    expect(missingOwnerFlag).toEqual([]);
  });

  it("getApprovalStateLabel clearly distinguishes it from other statuses (never the raw enum string)", () => {
    const label = getApprovalStateLabel(CLAIMS.rateWeekday);
    expect(label).not.toBe("STEWARD_APPROVED_FOR_PROTOTYPE");
    expect(label.toLowerCase()).toContain("steward approved");
    expect(label.toLowerCase()).toContain("owner confirmation");
  });

  it("steward-approved rates and capacity do not appear in unauthenticated public output", () => {
    const publicIds = new Set(getPublicClaims().map((c) => c.id));
    for (const id of [
      "CLM-RATE-001",
      "CLM-RATE-002",
      "CLM-RATE-003",
      "CLM-RATE-004",
      "CLM-RATE-005",
      "CLM-CAP-001",
      "CLM-CAP-002",
      "CLM-CAP-003",
    ]) {
      expect(publicIds.has(id)).toBe(false);
    }
  });

  it("does not move any claim all the way to APPROVED_FOR_PUBLICATION during this reconciliation", () => {
    const prematurelyApproved = getAllClaims().filter(
      (claim) => claim.status === "APPROVED_FOR_PUBLICATION"
    );
    expect(prematurelyApproved).toEqual([]);
  });
});

describe("mandatory blank property facts", () => {
  it("remain UNVERIFIED with no value invented during reconciliation", () => {
    const factClaims = getAllClaims().filter((claim) => claim.category === "fact");
    expect(factClaims.length).toBeGreaterThan(0);
    for (const claim of factClaims) {
      expect(claim.status).toBe("UNVERIFIED");
      expect(claim.value).toBeNull();
      expect(isPublicClaim(claim)).toBe(false);
    }
  });
});
