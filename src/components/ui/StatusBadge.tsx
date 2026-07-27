import { clsx } from "clsx";
import type { InquiryStatus } from "@/types/inquiry";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
  SPAM: "Spam",
};

const STATUS_CLASSES: Record<InquiryStatus, string> = {
  NEW: "bg-gold-soft/40 text-forest-deep border-gold",
  REVIEWING: "bg-sand text-ink border-border",
  CONTACTED: "bg-white text-success border-success",
  CLOSED: "bg-white text-muted border-border",
  SPAM: "bg-white text-danger border-danger",
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        STATUS_CLASSES[status]
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
