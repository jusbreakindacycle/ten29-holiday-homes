import { getAllClaims, isPublicClaim } from "@/content/claims";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(not supplied)";
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

export default function AdminClaimsPage() {
  const claims = getAllClaims();

  return (
    <div>
      <h1 className="font-heading text-3xl text-forest">Claim registry</h1>
      <p className="mt-1 text-muted max-w-2xl">
        The full machine-enforced claim registry mirrored from{" "}
        <code>docs/05_OWNER_APPROVAL_MATRIX.md</code>. Green rows are currently visible to guests.
      </p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">ID</th>
              <th scope="col" className="px-4 py-3 font-semibold">Category</th>
              <th scope="col" className="px-4 py-3 font-semibold">Label</th>
              <th scope="col" className="px-4 py-3 font-semibold">Value</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold">Public?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {claims.map((claim) => (
              <tr key={claim.id} className={isPublicClaim(claim) ? "bg-success/5" : undefined}>
                <td className="px-4 py-3 font-mono text-xs text-muted">{claim.id}</td>
                <td className="px-4 py-3 capitalize">{claim.category}</td>
                <td className="px-4 py-3">{claim.label}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={formatValue(claim.value)}>
                  {formatValue(claim.value)}
                </td>
                <td className="px-4 py-3">{claim.status}</td>
                <td className="px-4 py-3">
                  {isPublicClaim(claim) ? (
                    <span className="font-semibold text-success">Yes</span>
                  ) : (
                    <span className="text-muted">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
