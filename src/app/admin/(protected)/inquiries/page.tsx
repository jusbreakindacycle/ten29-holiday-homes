import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listInquiries } from "@/services/inquiry-service";
import { AdminInquiriesTable } from "@/components/features/admin/AdminInquiriesTable";
import { Alert } from "@/components/ui/Alert";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/types/inquiry";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = firstValue(params.status);
  const search = firstValue(params.search);
  const checkInFrom = firstValue(params.checkInFrom);
  const source = firstValue(params.source);

  let inquiries: Awaited<ReturnType<typeof listInquiries>> = [];
  let loadError: string | null = null;
  try {
    const client = await createSupabaseServerClient();
    inquiries = await listInquiries(client, {
      status: status && INQUIRY_STATUSES.includes(status as InquiryStatus) ? (status as InquiryStatus) : undefined,
      search: search || undefined,
      checkInFrom: checkInFrom || undefined,
      source: source || undefined,
    });
  } catch {
    loadError = "Could not load inquiries. Confirm Supabase is configured (see .env.example).";
  }

  const exportQuery = new URLSearchParams();
  if (status) exportQuery.set("status", status);
  if (search) exportQuery.set("search", search);
  if (checkInFrom) exportQuery.set("checkInFrom", checkInFrom);
  if (source) exportQuery.set("source", source);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-forest">Inquiries</h1>
          <p className="mt-1 text-muted">{inquiries.length} matching enquiry record(s).</p>
        </div>
        <a
          href={`/admin/inquiries/export?${exportQuery.toString()}`}
          className="rounded-sm border border-forest px-4 py-2 text-sm font-semibold text-forest hover:bg-white"
        >
          Export CSV
        </a>
      </div>

      <form method="GET" className="mt-6 grid gap-3 sm:grid-cols-4 rounded-sm border border-border bg-white p-4">
        <div>
          <label htmlFor="search" className="block text-xs font-semibold text-muted mb-1">
            Search
          </label>
          <input
            id="search"
            name="search"
            defaultValue={search}
            placeholder="Name, mobile, or reference"
            className="w-full rounded-sm border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-semibold text-muted mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="checkInFrom" className="block text-xs font-semibold text-muted mb-1">
            Check-in from
          </label>
          <input
            id="checkInFrom"
            name="checkInFrom"
            type="date"
            defaultValue={checkInFrom}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-xs font-semibold text-muted mb-1">
            Source
          </label>
          <input
            id="source"
            name="source"
            defaultValue={source}
            placeholder="website, facebook…"
            className="w-full rounded-sm border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-sm bg-forest px-4 py-2 text-sm font-semibold text-ivory"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {loadError ? (
        <div className="mt-6">
          <Alert tone="warning">{loadError}</Alert>
        </div>
      ) : (
        <div className="mt-6">
          <AdminInquiriesTable inquiries={inquiries} />
        </div>
      )}
    </div>
  );
}
