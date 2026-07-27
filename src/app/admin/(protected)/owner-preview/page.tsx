import { getApprovalStateLabel, getOwnerPreviewClaims, isStewardApprovedForPrototype } from "@/content/claims";
import type { Claim } from "@/content/claim-types";
import { OWNER_PREVIEW_REQUIRED_ASSETS } from "@/content/owner-preview-assets";
import { Alert } from "@/components/ui/Alert";
import { isOwnerPreviewEnabled } from "@/lib/site-config";

const SECTION_ORDER = [
  "Brand and positioning",
  "Audience and location",
  "Capacity",
  "Rates and promotions",
  "Operating hours",
  "Payment process",
  "Cancellation and rescheduling",
  "House rules",
  "Facts still requiring verification",
  "Assets still required",
] as const;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(not supplied)";
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

function groupByPreviewSection(claims: Claim[]): Map<string, Claim[]> {
  const grouped = new Map<string, Claim[]>();
  for (const claim of claims) {
    const section = claim.previewSection ?? "Other proposed items";
    const list = grouped.get(section) ?? [];
    list.push(claim);
    grouped.set(section, list);
  }
  return grouped;
}

export default function OwnerPreviewPage() {
  if (!isOwnerPreviewEnabled()) {
    return (
      <div>
        <h1 className="font-heading text-3xl text-forest">Owner preview</h1>
        <div className="mt-6">
          <Alert tone="info" title="Owner preview is disabled in this environment">
            Set NEXT_PUBLIC_ENABLE_OWNER_PREVIEW=true to enable this review screen.
          </Alert>
        </div>
      </div>
    );
  }

  const claims = getOwnerPreviewClaims();
  const byCategory = groupByPreviewSection(claims);
  const orderedSections = [
    ...SECTION_ORDER.filter((section) => section !== "Assets still required"),
  ].filter((section) => byCategory.has(section));
  const knownSections: readonly string[] = SECTION_ORDER;
  const extraSections = Array.from(byCategory.keys()).filter(
    (section) => !knownSections.includes(section)
  );

  return (
    <div>
      <h1 className="font-heading text-3xl text-forest">Owner preview</h1>
      <p className="mt-1 text-muted max-w-2xl">
        This is a decision-ready business configuration prepared by the Project Steward. Every
        item below is <strong>Steward approved for prototype</strong> — approved for
        implementation, internal development, and this authenticated preview — but{" "}
        <strong>none of it is approved for public publication</strong> until the actual TEN29
        owner confirms it. Guests never see this page or its contents. See{" "}
        <code>docs/26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION.md</code>.
      </p>

      <div className="mt-8 space-y-8">
        {[...orderedSections, ...extraSections].map((section) => {
          const sectionClaims = byCategory.get(section) ?? [];
          return (
            <div key={section} className="rounded-sm border border-border bg-white p-6">
              <h2 className="font-heading text-xl text-forest mb-4">{section}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">ID</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Label</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Proposed final value</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Approval state</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Owner confirmation</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Affected pages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sectionClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="py-2 pr-4 font-mono text-xs text-muted">{claim.id}</td>
                        <td className="py-2 pr-4">{claim.label}</td>
                        <td className="py-2 pr-4">{formatValue(claim.value)}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                            {getApprovalStateLabel(claim)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {isStewardApprovedForPrototype(claim) || claim.ownerVerificationRequired
                            ? "Required before publication"
                            : "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted">
                          {claim.affectedRoutes?.join(", ") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="rounded-sm border border-border bg-white p-6">
          <h2 className="font-heading text-xl text-forest mb-4">Assets still required</h2>
          <p className="text-sm text-muted mb-4">
            Not a business decision — these are photographs, accounts, and confirmations only the
            actual TEN29 owner can supply. See docs/26 §5 and docs/24_ASSET_REQUIREMENTS.md.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Asset</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Website use</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Supplied by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {OWNER_PREVIEW_REQUIRED_ASSETS.map((asset) => (
                  <tr key={asset.name}>
                    <td className="py-2 pr-4">{asset.name}</td>
                    <td className="py-2 pr-4 text-muted">{asset.websiteUse}</td>
                    <td className="py-2 pr-4 text-muted">{asset.suppliedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
