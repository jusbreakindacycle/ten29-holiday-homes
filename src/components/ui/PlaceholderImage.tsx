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
      className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-gold-soft bg-sand text-center"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(184,138,47,0.06)_10px,rgba(184,138,47,0.06)_11px)]"
      />
      <span aria-hidden="true" className="relative font-heading text-2xl text-gold sm:text-3xl">
        TEN29
      </span>
      <span className="relative px-6 text-xs font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="relative rounded-full border border-gold-soft bg-ivory px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
        Photo pending
      </span>
    </div>
  );
}
