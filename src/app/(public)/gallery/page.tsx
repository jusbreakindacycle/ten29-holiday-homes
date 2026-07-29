import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GalleryCard } from "@/components/ui/GalleryCard";
import { Alert } from "@/components/ui/Alert";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos of TEN29 Holiday Homes in Biclatan, General Trias, Cavite.",
  alternates: { canonical: `${getSiteUrl()}/gallery` },
};

const GALLERY_GROUPS: Array<{ title: string; items: string[] }> = [
  { title: "Exterior & entrance", items: ["Exterior", "Entrance"] },
  { title: "Living spaces", items: ["Living area", "Kitchen & dining"] },
  { title: "Bedrooms", items: ["Bedroom 1 (queen-size bed)", "Bedroom 2 (twin beds)", "Bedroom 3 (double-deck bed)"] },
  { title: "Bathrooms & lanai", items: ["Bathrooms", "Private lanai"] },
  { title: "Parking, amenities & safety", items: ["Parking", "Amenities", "Safety equipment"] },
];

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Gallery"
        title="TEN29 in pictures"
        description="Every photo here will be an original, owner-approved photo of the actual property — never a stock or borrowed image."
      />

      <div className="mt-8">
        <Alert tone="info" title="Gallery status">
          {FALLBACK_COPY.gallery}
        </Alert>
      </div>

      <div className="mt-12 space-y-12">
        {GALLERY_GROUPS.map((group) => {
          const headingId = `gallery-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
          <section key={group.title} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className="text-sm font-semibold uppercase tracking-wide text-gold"
            >
              {group.title}
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((label) => (
                <GalleryCard key={label} alt={`TEN29 ${label.toLowerCase()}`} caption={label} />
              ))}
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}
