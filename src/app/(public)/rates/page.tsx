import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RateCard } from "@/components/ui/RateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { CLAIMS, getPublicClaim, getPublicClaimOrFallback } from "@/content/claims";
import { FALLBACK_COPY, NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";
import type { Claim } from "@/content/claim-types";

export const metadata: Metadata = {
  title: "Rates",
  description: "TEN29 Holiday Homes rates in Biclatan, General Trias, Cavite.",
  alternates: { canonical: `${getSiteUrl()}/rates` },
};

const RATE_CLAIMS: Array<[keyof typeof CLAIMS, string]> = [
  ["rateWeekday", "Sunday–Thursday"],
  ["rateFriday", "Friday"],
  ["rateSaturday", "Saturday"],
  ["ratePublicHoliday", "Declared public holiday"],
  ["ratePeakHoliday", "Peak holiday period"],
  ["rateAdditionalGuest", "Additional overnight guest"],
  ["securityDeposit", "Refundable security deposit"],
  ["earlyLateFee", "Early check-in / late check-out"],
];

export default function RatesPage() {
  const publicRates = RATE_CLAIMS.map(([key, label]) => ({
    label,
    value: getPublicClaim(CLAIMS[key] as Claim),
  })).filter((entry): entry is { label: string; value: string } => typeof entry.value === "string");
  const accommodationModel = getPublicClaimOrFallback(
    CLAIMS.accommodationModel,
    "The whole house remains private for one guest group. Bedroom access is arranged according to the selected one-, two-, or three-bedroom stay option."
  );
  const stayDurationOptions = getPublicClaim(CLAIMS.stayDurationOptions);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Rates"
        title="TEN29 rates"
        description="Every figure below is either a rate the owner has approved for publication, or an honest statement that it isn't published yet."
      />

      <div className="mt-8 rounded-sm border border-border bg-white p-6">
        <h2 className="font-heading text-xl text-forest">How quotations work</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">{accommodationModel}</p>
        {stayDurationOptions ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{stayDurationOptions}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <Alert tone="warning" title="Before you request a quote">
          {NON_RESERVATION_NOTICE}
        </Alert>
      </div>

      <div className="mt-10">
        <h2 className="font-heading text-xl text-forest">Rate categories</h2>
        <div className="mt-5 space-y-4">
          {publicRates.length > 0 ? (
            publicRates.map((rate) => <RateCard key={rate.label} label={rate.label} value={rate.value} />)
          ) : (
            <EmptyState title="Rates pending publication">{FALLBACK_COPY.rates}</EmptyState>
          )}
        </div>
      </div>

      <div className="mt-10">
        <CtaLink href="/book">Get a Verified Quotation</CtaLink>
      </div>
    </div>
  );
}
