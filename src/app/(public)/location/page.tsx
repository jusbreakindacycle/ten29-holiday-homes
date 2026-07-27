import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { CLAIMS, getPublicClaimOrFallback } from "@/content/claims";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import { getGoogleMapsUrl, getPublicAddress, getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Location",
  description: "TEN29 Holiday Homes is located in Biclatan, General Trias, Cavite.",
  alternates: { canonical: `${getSiteUrl()}/location` },
};

export default function LocationPage() {
  const address = getPublicAddress();
  const locationCopy = getPublicClaimOrFallback(CLAIMS.locationCopy, FALLBACK_COPY.locationDetail);
  const maps = getGoogleMapsUrl();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading eyebrow="Location" title="Getting to TEN29" description={locationCopy} />

      <div className="mt-8">
        <Alert tone="warning" title="A note on location accuracy">
          TEN29 Holiday Homes is located in General Trias, Cavite — it is not located in Tagaytay.
          The area has road access toward Amadeo and Tagaytay, which is a separate statement from
          being located there.
        </Alert>
      </div>

      <div className="mt-10 rounded-sm border border-border bg-white p-6">
        <h2 className="font-heading text-xl text-forest">Address</h2>
        <p className="mt-2 text-ink">{address}</p>
        <p className="mt-2 text-sm text-muted">
          The complete block-and-lot address is shared directly with confirmed guests.
        </p>
        {maps ? (
          <CtaLink href={maps} variant="secondary" className="mt-4 inline-flex">
            Open in Google Maps
          </CtaLink>
        ) : (
          <p className="mt-4 text-sm text-muted">Google Maps link pending confirmation.</p>
        )}
      </div>
    </div>
  );
}
