import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardCounts } from "@/services/inquiry-service";
import { Alert } from "@/components/ui/Alert";

const STATUS_CARDS: Array<{ key: "NEW" | "REVIEWING" | "CONTACTED" | "CLOSED" | "SPAM"; label: string }> = [
  { key: "NEW", label: "New" },
  { key: "REVIEWING", label: "Reviewing" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "CLOSED", label: "Closed" },
  { key: "SPAM", label: "Spam" },
];

export default async function AdminDashboardPage() {
  let counts: Awaited<ReturnType<typeof getDashboardCounts>> | null = null;
  let loadError: string | null = null;
  try {
    const client = await createSupabaseServerClient();
    counts = await getDashboardCounts(client);
  } catch {
    loadError = "Could not load dashboard counts. Confirm Supabase is configured (see .env.example).";
  }

  return (
    <div>
      <h1 className="font-heading text-3xl text-forest">Dashboard</h1>
      <p className="mt-1 text-muted">Overview of TEN29 booking enquiries.</p>

      {loadError ? (
        <div className="mt-6">
          <Alert tone="warning">{loadError}</Alert>
        </div>
      ) : null}

      {counts ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {STATUS_CARDS.map((card) => (
              <div key={card.key} className="rounded-sm border border-border bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
                <p className="mt-2 font-heading text-3xl text-forest">{counts[card.key]}</p>
              </div>
            ))}
          </div>

          {counts.notificationFailures > 0 ? (
            <div className="mt-6">
              <Alert tone="warning" title="Notification failures">
                {counts.notificationFailures} enquiry email notification
                {counts.notificationFailures === 1 ? "" : "s"} failed to send. Review affected
                inquiries in the list — the enquiries themselves are safely stored.
              </Alert>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-8">
        <Link href="/admin/inquiries" className="text-sm font-semibold text-forest underline">
          View all inquiries →
        </Link>
      </div>
    </div>
  );
}
