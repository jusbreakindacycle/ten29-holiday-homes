export type ClaimStatus =
  | "VERIFIED"
  | "OWNER_REPORTED"
  | "PROPOSED_PENDING_APPROVAL"
  | "STEWARD_APPROVED_FOR_PROTOTYPE"
  | "UNVERIFIED"
  | "APPROVED_FOR_PUBLICATION"
  | "REJECTED_OR_SUPERSEDED";

export type ClaimSurface = "public" | "owner-preview" | "restricted";

export type ClaimValue = string | number | boolean | string[] | null;

export interface Claim<T extends ClaimValue = ClaimValue> {
  /** Stable ID, e.g. CLM-RATE-001. Matches docs/05_OWNER_APPROVAL_MATRIX.md. */
  id: string;
  /** Grouping used by the owner-preview and claims admin views. */
  category:
    | "business"
    | "positioning"
    | "capacity"
    | "rate"
    | "promotion"
    | "hours"
    | "payment"
    | "cancellation"
    | "houseRule"
    | "fact";
  /** Short human label. */
  label: string;
  value: T;
  status: ClaimStatus;
  source: string;
  approvedBy?: string;
  approvedAt?: string;
  allowedSurfaces: ClaimSurface[];
  notes?: string;
  supersededBy?: string;
  /**
   * True when the actual TEN29 owner must still accept this as a factual or
   * commercial business commitment before it can move to APPROVED_FOR_PUBLICATION.
   * Set on STEWARD_APPROVED_FOR_PROTOTYPE claims per docs/26.
   */
  ownerVerificationRequired?: boolean;
  /** Website routes this claim's value would affect once published. */
  affectedRoutes?: string[];
  /** Grouping used by the owner-preview page — see docs/26 §3 sections. */
  previewSection?: string;
}

const PUBLIC_STATUSES: ReadonlySet<ClaimStatus> = new Set([
  "VERIFIED",
  "APPROVED_FOR_PUBLICATION",
]);

/**
 * The single enforcement point for the public-claim gate: a claim may render
 * on a public route only if BOTH its status and its allowed surfaces permit it.
 */
export function isPublicClaim(claim: Claim): boolean {
  return (
    PUBLIC_STATUSES.has(claim.status) && claim.allowedSurfaces.includes("public")
  );
}

/** Returns the claim's value if publicly renderable, otherwise undefined. */
export function getPublicClaim<T extends ClaimValue>(
  claim: Claim<T> | undefined
): T | undefined {
  if (!claim) return undefined;
  return isPublicClaim(claim) ? claim.value : undefined;
}

/** Returns the claim's value if public, otherwise a caller-supplied fallback. */
export function getPublicClaimOrFallback<T extends ClaimValue>(
  claim: Claim<T> | undefined,
  fallback: T
): T {
  const value = getPublicClaim(claim);
  return value === undefined ? fallback : value;
}

/** True for claims the Project Steward has approved for prototype/owner-preview use only. */
export function isStewardApprovedForPrototype(claim: Claim): boolean {
  return claim.status === "STEWARD_APPROVED_FOR_PROTOTYPE";
}

/**
 * Human-readable approval state for the owner-preview and claims-admin views.
 * The single place that turns internal status vocabulary into words a reader
 * (including the actual TEN29 owner) can act on — see docs/13's rule that
 * guests and non-technical readers never see raw status strings.
 */
export function getApprovalStateLabel(claim: Claim): string {
  switch (claim.status) {
    case "STEWARD_APPROVED_FOR_PROTOTYPE":
      return "Steward approved for prototype — actual owner confirmation required";
    case "APPROVED_FOR_PUBLICATION":
      return "Approved for publication";
    case "VERIFIED":
      return "Verified";
    case "OWNER_REPORTED":
      return "Owner reported";
    case "PROPOSED_PENDING_APPROVAL":
      return "Proposed — pending approval";
    case "UNVERIFIED":
      return "Unverified";
    case "REJECTED_OR_SUPERSEDED":
      return "Rejected or superseded";
  }
}
