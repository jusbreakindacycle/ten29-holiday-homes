export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-border bg-white/60 px-6 py-10 text-center">
      <p className="font-heading text-xl text-forest">{title}</p>
      {children ? <p className="mt-2 text-sm text-muted">{children}</p> : null}
    </div>
  );
}
