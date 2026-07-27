import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Property",
  description: "What TEN29 Holiday Homes offers in Biclatan, General Trias, Cavite.",
  alternates: { canonical: `${getSiteUrl()}/property` },
};

const FACT_ROWS: Array<{ label: string; note: string }> = [
  { label: "Bedrooms & beds", note: "Published once the owner confirms exact counts." },
  { label: "Bathrooms", note: "Published once the owner confirms exact counts." },
  { label: "Maximum safe occupancy", note: "Published once verified against actual property capacity." },
  { label: "Parking", note: "Published once confirmed with subdivision rules." },
  { label: "Wi-Fi & entertainment", note: "Published once confirmed as working amenities." },
  { label: "Kitchen & appliances", note: "Published once confirmed as working amenities." },
];

export default function PropertyPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Property"
        title="The TEN29 property"
        description="TEN29 Holiday Homes is located in Biclatan, General Trias, Cavite. Full room-by-room detail is published as soon as it is verified — nothing here is guessed."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderImage label="Exterior" />
        <PlaceholderImage label="Living area" />
        <PlaceholderImage label="Bedroom" />
      </div>

      <div className="mt-12">
        <Alert tone="info" title="Amenity information">
          {FALLBACK_COPY.amenities}
        </Alert>
      </div>

      <div className="mt-10 overflow-hidden rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Property facts and their publication status</caption>
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
            {FACT_ROWS.map((row) => (
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
