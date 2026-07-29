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
  const surroundings = getPublicClaimOrFallback(CLAIMS.surroundingsStatement, "");
  const surroundingsActivity = getPublicClaimOrFallback(CLAIMS.surroundingsActivity, "");
  const travelTimeTagaytay = getPublicClaimOrFallback(CLAIMS.travelTimeTagaytay, "");
  const travelTimeCalax = getPublicClaimOrFallback(CLAIMS.travelTimeCalax, "");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading as="h1" eyebrow="Location" title="Getting to TEN29" description={locationCopy} />

      <div className="mt-8">
        <Alert tone="warning" title="A note on location accuracy">
          TEN29 Holiday Homes is located in General Trias, Cavite — it is not located in Tagaytay.
          The area has road access toward Amadeo and Tagaytay, which is a separate statement from
          being located there.
        </Alert>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="rounded-sm border border-border bg-white p-6">
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

        <div
          role="img"
          aria-label="Embedded map — pending configuration"
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed border-gold-soft bg-sand p-6 text-center lg:aspect-auto lg:h-full lg:min-h-64"
        >
          <span aria-hidden="true" className="font-heading text-2xl text-gold">
            Map
          </span>
          <span className="max-w-xs text-xs uppercase tracking-widest text-muted">
            Interactive map embed pending configuration
          </span>
          {maps ? (
            <CtaLink href={maps} variant="ghost" className="mt-2">
              Open directions in Google Maps →
            </CtaLink>
          ) : null}
        </div>
      </div>

      {(travelTimeTagaytay || travelTimeCalax) && (
        <div className="mt-6 rounded-sm border border-border bg-white p-6">
          <h2 className="font-heading text-xl text-forest">Travel times</h2>
          <ul className="mt-2 space-y-1 text-ink">
            {travelTimeTagaytay ? <li>{travelTimeTagaytay}</li> : null}
            {travelTimeCalax ? <li>{travelTimeCalax}</li> : null}
          </ul>
        </div>
      )}

      {(surroundings || surroundingsActivity) && (
        <div className="mt-6 rounded-sm border border-border bg-white p-6">
          <h2 className="font-heading text-xl text-forest">Surroundings</h2>
          {surroundings ? <p className="mt-2 text-ink">{surroundings}</p> : null}
          {surroundingsActivity ? <p className="mt-2 text-sm text-muted">{surroundingsActivity}</p> : null}
        </div>
      )}
    </div>
  );
}
