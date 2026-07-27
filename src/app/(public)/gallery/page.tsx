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

const GALLERY_PLACEHOLDERS = [
  "Exterior",
  "Living area",
  "Bedroom",
  "Bathroom",
  "Kitchen & dining",
  "Parking & entrance",
];

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Gallery"
        title="TEN29 in pictures"
        description="Every photo here will be an original, owner-approved photo of the actual property — never a stock or borrowed image."
      />

      <div className="mt-8">
        <Alert tone="info" title="Gallery status">
          {FALLBACK_COPY.gallery}
        </Alert>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERY_PLACEHOLDERS.map((label) => (
          <GalleryCard key={label} alt={`TEN29 ${label.toLowerCase()}`} caption={label} />
        ))}
      </div>
    </div>
  );
}
