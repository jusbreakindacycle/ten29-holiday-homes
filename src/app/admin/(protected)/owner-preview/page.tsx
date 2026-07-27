import { getOwnerPreviewClaims } from "@/content/claims";
import { Alert } from "@/components/ui/Alert";
import { isOwnerPreviewEnabled } from "@/lib/site-config";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(not supplied)";
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
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
  const byCategory = new Map<string, typeof claims>();
  for (const claim of claims) {
    const list = byCategory.get(claim.category) ?? [];
    list.push(claim);
    byCategory.set(claim.category, list);
  }

  return (
    <div>
      <h1 className="font-heading text-3xl text-forest">Owner preview</h1>
      <p className="mt-1 text-muted max-w-2xl">
        Everything below is proposed or unverified and is not visible to guests. Approve values by
        updating their status in <code>src/content/claims.ts</code> together with
        <code> docs/05_OWNER_APPROVAL_MATRIX.md</code>, recording an approver and date.
      </p>

      <div className="mt-8 space-y-8">
        {Array.from(byCategory.entries()).map(([category, categoryClaims]) => (
          <div key={category} className="rounded-sm border border-border bg-white p-6">
            <h2 className="font-heading text-xl text-forest mb-4 capitalize">{category}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-semibold">ID</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Label</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Value</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoryClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="py-2 pr-4 font-mono text-xs text-muted">{claim.id}</td>
                      <td className="py-2 pr-4">{claim.label}</td>
                      <td className="py-2 pr-4">{formatValue(claim.value)}</td>
                      <td className="py-2 pr-4">
                        <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
