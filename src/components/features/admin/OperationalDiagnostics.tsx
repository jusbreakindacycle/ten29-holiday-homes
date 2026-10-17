'use client';
import { useState } from 'react';
export function OperationalDiagnostics() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/admin/operations', { cache: 'no-store' });
      if (!response.ok) throw Error();
      setResult(await response.json());
    } catch { setError('Diagnostics unavailable or OWNER access denied. Retry after checking your session.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded border border-border bg-ivory p-5">
    <h1 className="font-heading text-2xl">Operational readiness</h1>
    <p>OWNER-only checks. Liveness does not prove database, email or media readiness.</p>
    <button className="min-h-11 rounded bg-forest px-5 text-ivory" disabled={busy} onClick={refresh}>{busy ? 'Checking…' : 'Refresh diagnostics'}</button>
    <p role="alert">{error}</p>
    {result && <div aria-live="polite" className="space-y-4">{Object.entries(result).map(([key, value]) => <div key={key}>
      <h2 className="font-semibold">{key.replaceAll('_', ' ')}</h2>
      <pre className="whitespace-pre-wrap break-words text-sm">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</pre>
    </div>)}</div>}
    <p>Review failed, paused or expired notification tasks in Requests. Retry only inside the provider deduplication window; check delivery manually after it expires. SENT means provider acceptance.</p>
    <p>Review failed or stuck media in Media. Retry processing after the lease expires; archive and clean abandoned files. Cleanup failures retain quota until successfully retried. Storage reachability and codec execution are verified separately, not by this database check.</p>
    <p>Production backup frequency, monitoring alerts, worker scheduling and owner UAT remain approval gates.</p>
  </section>;
}
