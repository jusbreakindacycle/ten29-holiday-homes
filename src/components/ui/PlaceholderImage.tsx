/**
 * Elegant neutral placeholder used until TEN29 supplies original, owner-approved
 * photography. Never a stock tourism photo or a copied competitor image.
 * See docs/24_ASSET_REQUIREMENTS.md.
 */
export function PlaceholderImage({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} — photo pending`}
      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed border-gold-soft bg-sand text-center"
    >
      <span aria-hidden="true" className="font-heading text-3xl text-gold">
        TEN29
      </span>
      <span className="px-6 text-xs uppercase tracking-widest text-muted">
        {label} — photo pending
      </span>
    </div>
  );
}
