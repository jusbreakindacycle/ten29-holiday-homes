export type ClaimStatus =
  | "VERIFIED"
  | "OWNER_REPORTED"
  | "PROPOSED_PENDING_APPROVAL"
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
