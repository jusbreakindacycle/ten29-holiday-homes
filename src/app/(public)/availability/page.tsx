import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Availability",
  description: "How TEN29 Holiday Homes confirms availability for your requested dates.",
  alternates: { canonical: `${getSiteUrl()}/availability` },
};

const STEPS = [
  "You send your preferred check-in and check-out dates through the enquiry form.",
  "TEN29 checks those dates against real, current availability — manually, not through an automated calendar.",
  "TEN29 replies directly with confirmed availability, price, and payment instructions.",
  "A stay is only confirmed once you and TEN29 agree on it directly — the website does not do this automatically.",
];

export default function AvailabilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading
        eyebrow="Availability"
        title="How availability works"
        description="TEN29 does not yet publish a live availability calendar. Here is exactly how a date gets confirmed instead."
      />

      <div className="mt-8">
        <Alert tone="warning" title="Important">
          {NON_RESERVATION_NOTICE}
        </Alert>
      </div>

      <ol className="mt-10 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-4 rounded-sm border border-border bg-white p-5">
            <span className="font-heading text-2xl text-gold">{index + 1}</span>
            <p className="text-ink leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <CtaLink href="/book">Check Your Dates</CtaLink>
      </div>
    </div>
  );
}
