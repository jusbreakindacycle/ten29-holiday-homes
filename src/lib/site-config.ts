import { CLAIMS, getPublicClaim, getPublicClaimOrFallback } from "@/content/claims";

/** Canonical site URL, always without a trailing slash. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME ?? "TEN29 Holiday Homes";
}

export function getPhoneDisplay(): string {
  return getPublicClaimOrFallback(CLAIMS.phoneDisplay, "0961 586 8106");
}

export function getPhoneE164(): string {
  return getPublicClaimOrFallback(CLAIMS.phoneE164, "+639615868106");
}

export function getPublicAddress(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_ADDRESS ??
    getPublicClaimOrFallback(CLAIMS.generalLocation, "Biclatan, General Trias, Cavite 4107")
  );
}

export function getFacebookUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_FACEBOOK_URL || undefined;
}

export function getInstagramUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_INSTAGRAM_URL || undefined;
}

export function getGoogleMapsUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL || undefined;
}

export function getMessengerUrl(): string | undefined {
  const fb = getFacebookUrl();
  return fb ? `https://m.me/${extractFacebookHandle(fb)}` : undefined;
}

function extractFacebookHandle(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}

export function getBrandName(): string {
  return getPublicClaim(CLAIMS.brandName) ?? getSiteName();
}

export function isOwnerPreviewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OWNER_PREVIEW === "true";
}

export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
}
