import { CtaLink } from "@/components/ui/CtaButton";

export function Hero({
  headline,
  subcopy,
}: {
  headline: string;
  subcopy: string;
}) {
  return (
    <section className="relative overflow-hidden bg-forest text-ivory">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,138,47,0.18),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft mb-4">
          Biclatan, General Trias, Cavite
        </p>
        <h1 className="max-w-3xl font-heading text-4xl sm:text-5xl font-semibold leading-tight">
          {headline}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ivory/85 leading-relaxed">{subcopy}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <CtaLink href="/book" variant="primary" className="bg-gold border-gold text-forest-deep hover:bg-gold-soft">
            Request Your Dates
          </CtaLink>
          <CtaLink href="/property" variant="secondary" className="border-ivory/50 text-ivory hover:bg-ivory/10">
            View Property
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
