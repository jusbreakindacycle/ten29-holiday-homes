import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Inquiry } from "@/types/inquiry";

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminInquiriesTable({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-white p-10 text-center text-muted">
        No inquiries match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">TEN29 booking enquiries</caption>
        <thead className="bg-sand text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Reference</th>
            <th scope="col" className="px-4 py-3 font-semibold">Guest</th>
            <th scope="col" className="px-4 py-3 font-semibold">Dates</th>
            <th scope="col" className="px-4 py-3 font-semibold">Source</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Notification</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inquiries.map((inquiry) => (
            <tr key={inquiry.id} className="hover:bg-sand/40">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/inquiries/${inquiry.id}`}
                  className="font-semibold text-forest underline underline-offset-2"
                >
                  {inquiry.reference_code}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{inquiry.full_name}</p>
                <p className="text-xs text-muted">{inquiry.mobile_number}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDate(inquiry.check_in_date)} – {formatDate(inquiry.check_out_date)}
              </td>
              <td className="px-4 py-3 capitalize">{inquiry.source}</td>
              <td className="px-4 py-3">
                <StatusBadge status={inquiry.status} />
              </td>
              <td className="px-4 py-3">
                {inquiry.notification_status === "FAILED" ? (
                  <span className="text-danger font-semibold">Failed</span>
                ) : inquiry.notification_status === "SENT" ? (
                  <span className="text-success">Sent</span>
                ) : (
                  <span className="text-muted">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
