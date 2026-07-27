import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInquiryById, getAuditEventsForInquiry } from "@/services/inquiry-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusUpdateForm } from "@/components/features/admin/StatusUpdateForm";
import { NotesForm } from "@/components/features/admin/NotesForm";
import { Alert } from "@/components/ui/Alert";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const inquiry = await getInquiryById(client, id);

  if (!inquiry) notFound();

  const auditEvents = await getAuditEventsForInquiry(client, id);

  return (
    <div>
      <Link href="/admin/inquiries" className="text-sm text-forest underline">
        ← Back to inquiries
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-forest">{inquiry.reference_code}</h1>
          <p className="mt-1 text-muted">Submitted {new Date(inquiry.created_at).toLocaleString("en-PH")}</p>
        </div>
        <StatusBadge status={inquiry.status} />
      </div>

      {inquiry.notification_status === "FAILED" ? (
        <div className="mt-6">
          <Alert tone="warning" title="Owner notification failed">
            {inquiry.notification_error ?? "Unknown email delivery error."} The enquiry itself is
            safely stored — only the email alert failed.
          </Alert>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-sm border border-border bg-white p-6">
          <h2 className="font-heading text-xl text-forest mb-4">Guest details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={inquiry.full_name} />
            <Field label="Mobile" value={inquiry.mobile_number} />
            <Field label="Email" value={inquiry.email ?? "(not supplied)"} />
            <Field label="Source" value={inquiry.source} />
            <Field
              label="Check-in"
              value={new Date(`${inquiry.check_in_date}T00:00:00`).toLocaleDateString("en-PH")}
            />
            <Field
              label="Check-out"
              value={new Date(`${inquiry.check_out_date}T00:00:00`).toLocaleDateString("en-PH")}
            />
            <Field label="Adults" value={inquiry.adults} />
            <Field label="Children" value={inquiry.children} />
            <Field label="Day visitors" value={inquiry.day_visitors} />
            <Field label="Vehicles" value={inquiry.vehicles} />
            <Field label="Purpose of stay" value={inquiry.purpose_of_stay ?? "(not supplied)"} />
          </dl>
          <div className="mt-4">
            <dt className="text-xs uppercase tracking-wide text-muted">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink">{inquiry.message ?? "(none)"}</dd>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-sm border border-border bg-white p-6">
            <h2 className="font-heading text-xl text-forest mb-4">Update status</h2>
            <StatusUpdateForm id={inquiry.id} currentStatus={inquiry.status} />
          </div>
          <div className="rounded-sm border border-border bg-white p-6">
            <h2 className="font-heading text-xl text-forest mb-4">Notes</h2>
            <NotesForm id={inquiry.id} currentNotes={inquiry.owner_notes} />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-sm border border-border bg-white p-6">
        <h2 className="font-heading text-xl text-forest mb-4">Audit trail</h2>
        {auditEvents.length === 0 ? (
          <p className="text-sm text-muted">No audit events yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {auditEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline gap-2 border-b border-border pb-2 last:border-0">
                <span className="font-semibold text-ink">{event.event_type}</span>
                {event.previous_value || event.new_value ? (
                  <span className="text-muted">
                    {event.previous_value ?? "—"} → {event.new_value ?? "—"}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-muted">
                  {new Date(event.created_at).toLocaleString("en-PH")}
                  {event.actor ? ` · ${event.actor}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
