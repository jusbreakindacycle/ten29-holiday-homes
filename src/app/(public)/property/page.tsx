import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { CLAIMS, getPublicClaim } from "@/content/claims";
import type { Claim } from "@/content/claim-types";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Property",
  description: "What TEN29 Holiday Homes offers in Biclatan, General Trias, Cavite.",
  alternates: { canonical: `${getSiteUrl()}/property` },
};

const AMENITY_ROWS: Array<[keyof typeof CLAIMS, string]> = [
  ["factBedrooms", "Bedrooms"],
  ["factBeds", "Beds"],
  ["factBathrooms", "Bathrooms"],
  ["factAircon", "Air-conditioning"],
  ["factWifi", "Wi-Fi"],
  ["factTv", "Entertainment"],
  ["factKitchen", "Kitchen & dining"],
  ["factPropertyFeatures", "Property features"],
  ["factParkingAvailability", "Parking"],
  ["factCctvPresence", "CCTV"],
  ["factFireExtinguisher", "Fire extinguisher"],
  ["factSmokeDetectors", "Smoke alarm"],
  ["factToiletries", "Guest amenities"],
];

const PENDING_FACT_ROWS: Array<{ label: string; note: string }> = [
  { label: "Maximum safe occupancy", note: "Published once verified against actual property capacity." },
  { label: "Parking capacity (number of vehicles)", note: "Published once confirmed with subdivision rules." },
];

export default function PropertyPage() {
  const accommodationModel = getPublicClaim(CLAIMS.accommodationModel);
  const stayDurationOptions = getPublicClaim(CLAIMS.stayDurationOptions);
  const amenities = AMENITY_ROWS.map(([key, label]) => ({
    label,
    value: getPublicClaim(CLAIMS[key] as Claim),
  })).filter((entry): entry is { label: string; value: string } => typeof entry.value === "string");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Property"
        title="The TEN29 property"
        description="TEN29 Holiday Homes is located in Biclatan, General Trias, Cavite. Full room-by-room detail is published as soon as it is verified — nothing here is guessed."
      />

      <div className="mt-8">
        <Alert tone="info" title="How TEN29 works">
          {accommodationModel ??
            "The whole house remains private for one guest group. Bedroom access is arranged according to the selected one-, two-, or three-bedroom stay option."}
        </Alert>
        {stayDurationOptions ? <p className="mt-3 text-sm text-muted">{stayDurationOptions}</p> : null}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderImage label="Exterior" />
        <PlaceholderImage label="Living area" />
        <PlaceholderImage label="Bedroom" />
      </div>

      {amenities.length > 0 ? (
        <div className="mt-12 overflow-hidden rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Confirmed property amenities</caption>
            <thead className="bg-sand text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Feature
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {amenities.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-4 font-medium text-ink">{row.label}</td>
                  <td className="px-5 py-4 text-muted">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-12">
          <Alert tone="info" title="Amenity information">
            {FALLBACK_COPY.amenities}
          </Alert>
        </div>
      )}

      <div className="mt-10 overflow-hidden rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Property facts still pending publication</caption>
          <thead className="bg-sand text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Fact
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PENDING_FACT_ROWS.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-4 font-medium text-ink">{row.label}</td>
                <td className="px-5 py-4 text-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <CtaLink href="/book">Ask TEN29 About Your Group</CtaLink>
      </div>
    </div>
  );
}
