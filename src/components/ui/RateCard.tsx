export function RateCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border border-border bg-white px-5 py-4">
      <div>
        <p className="font-semibold text-ink">{label}</p>
        {note ? <p className="text-xs text-muted mt-0.5">{note}</p> : null}
      </div>
      <p className="font-heading text-xl text-forest whitespace-nowrap">{value}</p>
    </div>
  );
}
