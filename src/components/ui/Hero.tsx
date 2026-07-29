import { CtaLink } from "@/components/ui/CtaButton";

export function Hero({
  headline,
  subcopy,
  highlights = [],
}: {
  headline: string;
  subcopy: string;
  /** Short, owner-approved highlight labels shown in the "At a glance" panel. */
  highlights?: string[];
}) {
  return (
    <section className="relative overflow-hidden bg-forest text-ivory">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,138,47,0.18),transparent_55%)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">
            Biclatan, General Trias, Cavite
          </p>
          <h1 className="max-w-xl font-heading text-4xl font-semibold leading-[1.1] sm:text-5xl">
            {headline}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ivory/85">{subcopy}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <CtaLink
              href="/book"
              variant="primary"
              className="border-gold bg-gold text-forest-deep hover:bg-gold-soft"
            >
              Request Your Dates
            </CtaLink>
            <CtaLink href="/property" variant="secondary" className="border-ivory/50 text-ivory hover:bg-ivory/10">
              View Property
            </CtaLink>
          </div>
        </div>

        {highlights.length > 0 ? (
          <div className="relative rounded-sm border border-ivory/15 bg-ivory/5 p-6 sm:p-8">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-gold"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-gold"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
              At a glance
            </p>
            <ul className="mt-5 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ivory/90">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-gold-soft/50 to-transparent"
      />
    </section>
  );
}
