import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PolicyCard } from "@/components/ui/PolicyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { CLAIMS, getPublicClaim } from "@/content/claims";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Policies",
  description: "House rules, cancellation policy, and payment framework for TEN29 Holiday Homes.",
  alternates: { canonical: `${getSiteUrl()}/policies` },
};

export default function PoliciesPage() {
  const houseRules = getPublicClaim(CLAIMS.houseRules);
  const cancellation = [
    getPublicClaim(CLAIMS.cancel14Days),
    getPublicClaim(CLAIMS.cancel7to13Days),
    getPublicClaim(CLAIMS.cancelUnder7Days),
  ].filter((v): v is string => typeof v === "string");
  const safetyFacts = [
    getPublicClaim(CLAIMS.factCctvPresence),
    getPublicClaim(CLAIMS.factFireExtinguisher),
    getPublicClaim(CLAIMS.factSmokeDetectors),
  ].filter((v): v is string => typeof v === "string");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Policies"
        title="House rules & policies"
        description="These govern every stay at TEN29. Anything not yet owner-approved for publication is shown as pending rather than guessed."
      />

      <div className="mt-8">
        <Alert tone="info">{FALLBACK_COPY.policies}</Alert>
      </div>

      {safetyFacts.length > 0 ? (
        <div className="mt-8 rounded-sm border border-border bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">
            Safety on the property
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink">
            {safetyFacts.map((fact) => (
              <li key={fact} className="flex gap-2">
                <span aria-hidden="true" className="text-gold">
                  •
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">
          Rules &amp; cancellation
        </h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {houseRules && houseRules.length > 0 ? (
            <PolicyCard title="House rules" items={houseRules} />
          ) : (
            <EmptyState title="House rules pending publication">
              {FALLBACK_COPY.policies}
            </EmptyState>
          )}
          {cancellation.length > 0 ? (
            <PolicyCard title="Cancellation policy" items={cancellation} />
          ) : (
            <EmptyState title="Cancellation policy pending publication">
              {FALLBACK_COPY.policies}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
