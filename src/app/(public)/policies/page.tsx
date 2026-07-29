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
        eyebrow="Policies"
        title="House rules & policies"
        description="These govern every stay at TEN29. Anything not yet owner-approved for publication is shown as pending rather than guessed."
      />

      <div className="mt-8">
        <Alert tone="info">{FALLBACK_COPY.policies}</Alert>
      </div>

      {safetyFacts.length > 0 ? (
        <div className="mt-6 rounded-sm border border-border bg-white p-6">
          <h2 className="font-heading text-xl text-forest">Safety on the property</h2>
          <ul className="mt-2 space-y-1 text-ink">
            {safetyFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {houseRules && houseRules.length > 0 ? (
          <PolicyCard title="House rules" items={houseRules} />
        ) : (
          <EmptyState title="House rules pending publication" />
        )}
        {cancellation.length > 0 ? (
          <PolicyCard title="Cancellation policy" items={cancellation} />
        ) : (
          <EmptyState title="Cancellation policy pending publication" />
        )}
      </div>
    </div>
  );
}
