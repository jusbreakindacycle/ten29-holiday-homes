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
    expect(isPublicClaim(CLAIMS.factMaxSafeOccupancy)).toBe(false);
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

  it("does not move any steward-proposed commercial claim to APPROVED_FOR_PUBLICATION during this reconciliation", () => {
    // The 34 steward-approved decision groups (positioning, capacity, rates,
    // promotions, hours, payment, cancellation, house rules) still require actual
    // owner sign-off and must stay STEWARD_APPROVED_FOR_PROTOTYPE. Separately,
    // docs/27's owner-supplied property-fact reconciliation (2026-07-28)
    // legitimately moved specific fact/location claims to APPROVED_FOR_PUBLICATION
    // — see the "owner-supplied property facts" describe block below and
    // docs/21_DECISION_LOG.md.
    const commercialCategories = new Set([
      "positioning",
      "capacity",
      "rate",
      "promotion",
      "hours",
      "payment",
      "cancellation",
      "houseRule",
    ]);
    const prematurelyApproved = getAllClaims().filter(
      (claim) => commercialCategories.has(claim.category) && claim.status === "APPROVED_FOR_PUBLICATION"
    );
    expect(prematurelyApproved).toEqual([]);
  });
});

describe("remaining unresolved property facts", () => {
  it("stay UNVERIFIED with no value invented, and are not public", () => {
    const unresolvedFacts = getAllClaims().filter(
      (claim) => claim.category === "fact" && claim.status === "UNVERIFIED"
    );
    // Occupancy, parking capacity, pool access, pets, events, accessibility, CCTV
    // locations, first-aid, emergency exits, backup utilities, permits, operator
    // authorization, payment-account holder, and photo rights were not part of
    // the owner-supplied description and remain open — see docs/27.
    expect(unresolvedFacts.length).toBeGreaterThan(0);
    for (const claim of unresolvedFacts) {
      expect(claim.value).toBeNull();
      expect(isPublicClaim(claim)).toBe(false);
    }
  });

  it("never invents a value for maximum safe occupancy or parking vehicle capacity", () => {
    expect(CLAIMS.factMaxSafeOccupancy.status).toBe("UNVERIFIED");
    expect(CLAIMS.factMaxSafeOccupancy.value).toBeNull();
    expect(CLAIMS.factParking.status).toBe("UNVERIFIED");
    expect(CLAIMS.factParking.value).toBeNull();
  });
});

describe("owner-supplied property facts (reconciled 2026-07-28)", () => {
  const APPROVED_FACT_KEYS = [
    "accommodationModel",
    "stayDurationOptions",
    "factBedrooms",
    "factBeds",
    "factBathrooms",
    "factWifi",
    "factAircon",
    "factKitchen",
    "factTv",
    "factToiletries",
    "factFireExtinguisher",
    "factSmokeDetectors",
    "factParkingAvailability",
    "factCctvPresence",
    "factPropertyFeatures",
    "surroundingsStatement",
    "surroundingsActivity",
    "travelTimeTagaytay",
    "travelTimeCalax",
  ] as const;

  it("passes the public claim gate for every reconciled owner-approved fact", () => {
    for (const key of APPROVED_FACT_KEYS) {
      const claim = CLAIMS[key];
      expect(claim.status).toBe("APPROVED_FOR_PUBLICATION");
      expect(claim.approvedAt).toBeTruthy();
      expect(isPublicClaim(claim)).toBe(true);
    }
  });

  it("renders three bedrooms and two bathrooms publicly", () => {
    expect(getPublicClaim(CLAIMS.factBedrooms)).toContain("Three bedrooms");
    expect(getPublicClaim(CLAIMS.factBathrooms)).toContain("Two bathrooms");
  });

  it("renders the approved amenities publicly", () => {
    expect(getPublicClaim(CLAIMS.factWifi)).toContain("Wi-Fi is available");
    expect(getPublicClaim(CLAIMS.factAircon)).toContain("air-conditioned");
    expect(getPublicClaim(CLAIMS.factKitchen)).toContain("Induction cooker");
    expect(getPublicClaim(CLAIMS.factToiletries)).toContain("Shower bath gel");
  });

  it("renders the private-house, one-to-three-bedroom-access model correctly", () => {
    const model = getPublicClaim(CLAIMS.accommodationModel);
    expect(model).toContain("one related guest group at a time");
    expect(model).toContain("one, two, or three bedrooms");
  });

  it("never describes TEN29 as individually rented rooms", () => {
    const allPublicText = getAllClaims()
      .filter(isPublicClaim)
      .map((claim) => (typeof claim.value === "string" ? claim.value : ""))
      .join(" ")
      .toLowerCase();
    expect(allPublicText).not.toMatch(/individually (rented|booked) rooms?(?! is not)/);
    expect(allPublicText).not.toContain("rent a room");
    expect(allPublicText).not.toContain("book a room");
  });

  it("does not claim a Netflix subscription or account is included", () => {
    const tv = getPublicClaim(CLAIMS.factTv);
    expect(tv?.toLowerCase()).not.toContain("netflix subscription included");
    expect(tv?.toLowerCase()).not.toContain("netflix account included");
  });

  it("does not describe Wi-Fi as measured 'fast Wi-Fi'", () => {
    expect(getPublicClaim(CLAIMS.factWifi)?.toLowerCase()).not.toContain("fast wi-fi");
  });

  it("publishes CCTV and parking existence only — never quantities, locations, or vehicle capacity", () => {
    expect(getPublicClaim(CLAIMS.factCctvPresence)).toBe("CCTV is present on the property.");
    expect(getPublicClaim(CLAIMS.factParkingAvailability)).toBe(
      "Private gated parking is available inside the property."
    );
    expect(CLAIMS.factCctv.status).toBe("UNVERIFIED");
    expect(CLAIMS.factParking.status).toBe("UNVERIFIED");
  });

  it("never guarantees a travel time — every location claim is qualified", () => {
    expect(getPublicClaim(CLAIMS.travelTimeTagaytay)).toContain("depending on route and traffic");
    expect(getPublicClaim(CLAIMS.travelTimeCalax)).toContain("depending on route and traffic");
  });
});
