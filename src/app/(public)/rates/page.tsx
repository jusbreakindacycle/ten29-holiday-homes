import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RateCard } from "@/components/ui/RateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { CtaLink } from "@/components/ui/CtaButton";
import { CLAIMS, getPublicClaim } from "@/content/claims";
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
  const stayDurationOptions = getPublicClaim(CLAIMS.stayDurationOptions);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading
        eyebrow="Rates"
        title="TEN29 rates"
        description="Every figure below is either a rate the owner has approved for publication, or an honest statement that it isn't published yet."
      />

      <div className="mt-8">
        <Alert tone="info">{NON_RESERVATION_NOTICE}</Alert>
      </div>

      <div className="mt-10 space-y-4">
        {publicRates.length > 0 ? (
          publicRates.map((rate) => <RateCard key={rate.label} label={rate.label} value={rate.value} />)
        ) : (
          <EmptyState title="Rates pending publication">{FALLBACK_COPY.rates}</EmptyState>
        )}
      </div>

      {stayDurationOptions ? <p className="mt-6 text-sm text-muted">{stayDurationOptions}</p> : null}

      <div className="mt-10">
        <CtaLink href="/book">Get a Verified Quotation</CtaLink>
      </div>
    </div>
  );
}
