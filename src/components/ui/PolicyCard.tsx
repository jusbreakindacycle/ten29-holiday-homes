export function PolicyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-sm border border-border bg-white p-6">
      <h3 className="font-heading text-xl text-forest mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-ink leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-gold">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
