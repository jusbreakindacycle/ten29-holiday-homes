import { PublishedMedia } from '@/components/features/media/PublishedMedia';
export const dynamic='force-dynamic';
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
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

const FACT_GROUPS: Array<{ title: string; rows: Array<[keyof typeof CLAIMS, string]> }> = [
  {
    title: "Bedrooms and bathrooms",
    rows: [
      ["factBedrooms", "Bedrooms"],
      ["factBeds", "Beds"],
      ["factBathrooms", "Bathrooms"],
    ],
  },
  {
    title: "Living and comfort",
    rows: [
      ["factAircon", "Air-conditioning"],
      ["factWifi", "Wi-Fi"],
    ],
  },
  {
    title: "Kitchen and dining",
    rows: [["factKitchen", "Kitchen & dining"]],
  },
  {
    title: "Entertainment",
    rows: [["factTv", "TV & games"]],
  },
  {
    title: "Lanai and surroundings",
    rows: [["factPropertyFeatures", "Property features"]],
  },
  {
    title: "Parking and safety",
    rows: [
      ["factParkingAvailability", "Parking"],
      ["factCctvPresence", "CCTV"],
      ["factFireExtinguisher", "Fire extinguisher"],
      ["factSmokeDetectors", "Smoke alarm"],
    ],
  },
  {
    title: "Included guest essentials",
    rows: [["factToiletries", "Guest amenities"]],
  },
];

const PENDING_FACT_ROWS: Array<{ label: string; note: string }> = [
  { label: "Maximum safe occupancy", note: "Published once verified against actual property capacity." },
  { label: "Parking capacity (number of vehicles)", note: "Published once confirmed with subdivision rules." },
];

export default function PropertyPage() {
  const accommodationModel = getPublicClaim(CLAIMS.accommodationModel);
  const stayDurationOptions = getPublicClaim(CLAIMS.stayDurationOptions);
  const factGroups = FACT_GROUPS.map((group) => ({
    title: group.title,
    rows: group.rows
      .map(([key, label]) => ({ label, value: getPublicClaim(CLAIMS[key] as Claim) }))
      .filter((entry): entry is { label: string; value: string } => typeof entry.value === "string"),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Property"
        title="The TEN29 property"
        description="TEN29 Holiday Homes is located in Biclatan, General Trias, Cavite. Full room-by-room detail is published as soon as it is verified — nothing here is guessed."
      />

      <div className="mt-8 rounded-sm border border-border bg-white p-6">
        <h2 className="font-heading text-xl text-forest">Private-stay model</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          {accommodationModel ??
            "The whole house remains private for one guest group. Bedroom access is arranged according to the selected one-, two-, or three-bedroom stay option."}
        </p>
        {stayDurationOptions ? <p className="mt-3 text-sm text-muted">{stayDurationOptions}</p> : null}
      </div>

      <div className="mt-10">
        <PublishedMedia placement="property" />
      </div>

      {factGroups.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-heading text-xl text-forest">Property details</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {factGroups.map((group) => (
              <div key={group.title} className="rounded-sm border border-border bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">
                  {group.title}
                </h3>
                <dl className="mt-3 space-y-3">
                  {group.rows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-sm font-medium text-ink">{row.label}</dt>
                      <dd className="mt-0.5 text-sm leading-relaxed text-muted">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-12">
          <Alert tone="info" title="Amenity information">
            {FALLBACK_COPY.amenities}
          </Alert>
        </div>
      )}

      <div className="mt-12">
        <h2 className="font-heading text-xl text-forest">Facts pending publication</h2>
        <div className="mt-5 overflow-hidden rounded-sm border border-border bg-white">
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
      </div>

      <div className="mt-10">
        <CtaLink href="/book">Ask TEN29 About Your Group</CtaLink>
      </div>
    </div>
  );
}
