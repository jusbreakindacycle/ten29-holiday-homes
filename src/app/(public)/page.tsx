import { PublishedMedia } from '@/components/features/media/PublishedMedia';
export const dynamic='force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/ui/Hero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaLink } from "@/components/ui/CtaButton";
import { RateCard } from "@/components/ui/RateCard";
import { ContactCard } from "@/components/ui/ContactCard";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { LocalBusinessJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import { getFaqItems } from "@/content/faq";
import { CLAIMS, getPublicClaim, getPublicClaimOrFallback } from "@/content/claims";
import type { Claim } from "@/content/claim-types";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import {
  getGoogleMapsUrl,
  getMessengerUrl,
  getPhoneDisplay,
  getPhoneE164,
  getSiteUrl,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "TEN29 Holiday Homes — Biclatan, General Trias",
  description:
    "TEN29 Holiday Homes in Biclatan, General Trias, Cavite. Request your dates and TEN29 will confirm availability, price, and payment instructions directly.",
  alternates: { canonical: `${getSiteUrl()}/` },
};

export default function HomePage() {
  const headline = getPublicClaimOrFallback(CLAIMS.heroHeadline, FALLBACK_COPY.positioning);
  const subcopy = getPublicClaimOrFallback(
    CLAIMS.heroSubcopy,
    "A holiday-home stay in Biclatan, General Trias, Cavite."
  );
  const accommodationModel = getPublicClaimOrFallback(
    CLAIMS.accommodationModel,
    "The whole house remains private for one guest group. Bedroom access is arranged according to the selected one-, two-, or three-bedroom stay option."
  );
  const highlights = [
    {
      title: "Private whole-house stay",
      body: accommodationModel,
    },
    {
      title: "General Trias, Cavite",
      body: "Road access toward Amadeo and Tagaytay, without the Tagaytay price premium.",
    },
    {
      title: "Direct owner communication",
      body: "Every enquiry is reviewed personally — no automated instant booking, no fine print surprises.",
    },
  ];
  const phoneDisplay = getPhoneDisplay();
  const phoneE164 = getPhoneE164();
  const messenger = getMessengerUrl();
  const maps = getGoogleMapsUrl();
  const faqItems = getFaqItems().slice(0, 3);

  const heroHighlights = [
    { claim: CLAIMS.accommodationModel, label: "Entire private house" },
    { claim: CLAIMS.factBedrooms, label: "Three bedrooms" },
    { claim: CLAIMS.factBathrooms, label: "Two bathrooms" },
    { claim: CLAIMS.factAircon, label: "Air-conditioned living areas & bedrooms" },
    { claim: CLAIMS.factPropertyFeatures, label: "Private lanai" },
    { claim: CLAIMS.factParkingAvailability, label: "Gated parking" },
    { claim: CLAIMS.factWifi, label: "Wi-Fi & smart TV" },
    { claim: CLAIMS.stayDurationOptions, label: "Daily, weekly & monthly enquiries" },
  ]
    .filter((item) => Boolean(getPublicClaim(item.claim as Claim)))
    .map((item) => item.label);

  return (
    <>
      <LocalBusinessJsonLd />
      <Hero headline={headline} subcopy={subcopy} highlights={heroHighlights} />
      <section className="mx-auto max-w-6xl px-6 pt-6"><PublishedMedia placement="home" /></section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          eyebrow="About TEN29"
          title="A holiday home in Biclatan, General Trias"
          description="TEN29 Holiday Homes is a straightforward, honestly-described stay. Where a detail is still being finalized with the owner, this website says so plainly instead of guessing."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-sm border border-border bg-white p-6">
              <h3 className="font-heading text-xl text-forest">{item.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand py-16">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Gallery" title="A first look at TEN29" />
          <div className="mt-10">
            <PublishedMedia placement="teaser" />
          </div>
          <div className="mt-8">
            <CtaLink href="/gallery" variant="ghost">
              View full gallery →
            </CtaLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          eyebrow="How it works"
          title="Enquiry, not instant booking"
          description="Option 1 of the TEN29 website keeps a human in charge of every confirmation."
        />
        <ol className="mt-10 grid gap-6 sm:grid-cols-4">
          {[
            { step: "1", title: "Send your dates", body: "Tell TEN29 your preferred check-in and check-out dates and group size." },
            { step: "2", title: "TEN29 reviews", body: "Your enquiry is checked against real availability — manually, every time." },
            { step: "3", title: "You get a reply", body: "TEN29 replies with verified availability, price, and payment instructions." },
            { step: "4", title: "You confirm together", body: "Nothing is reserved until TEN29 confirms it with you directly." },
          ].map((item) => (
            <li key={item.step} className="rounded-sm border border-border bg-white p-6">
              <span className="font-heading text-3xl text-gold">{item.step}</span>
              <h3 className="mt-2 font-semibold text-forest">{item.title}</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-forest text-ivory py-16">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            eyebrow="Rates"
            title="Rates preview"
            description={FALLBACK_COPY.rates}
            className="[&_h2]:text-ivory [&_p]:text-ivory/75"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <RateCard label="Weeknight, weekend, and holiday rates" value="Request a quote" />
            <RateCard label="Security deposit and extra-guest fees" value="Request a quote" />
          </div>
          <div className="mt-8">
            <CtaLink href="/rates" variant="secondary" className="border-ivory/50 text-ivory hover:bg-ivory/10">
              See the full rates page →
            </CtaLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 grid gap-10 lg:grid-cols-2 items-start">
        <div>
          <SectionHeading
            eyebrow="Location"
            title="General Trias, Cavite"
            description="TEN29 is located in Biclatan, General Trias — not in Tagaytay. The area has road access toward Amadeo and Tagaytay, which makes it a convenient base without being a Tagaytay-priced stay."
          />
          <CtaLink href="/location" variant="ghost" className="mt-6 inline-flex">
            View directions →
          </CtaLink>
        </div>
        <div className="rounded-sm border border-border bg-sand p-6">
          <h3 className="font-heading text-xl text-forest">Frequently asked</h3>
          <div className="mt-4">
            <FaqAccordion items={faqItems} />
          </div>
          <Link href="/faq" className="mt-4 inline-block text-sm font-semibold text-forest underline">
            View all FAQs →
          </Link>
        </div>
      </section>

      <section className="bg-gold-soft/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-forest-deep">
            Ready to request your dates?
          </h2>
          <p className="mt-3 text-muted">
            Sending an enquiry does not reserve a date — TEN29 will confirm availability, price,
            and payment instructions with you directly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaLink href="/book">Request Your Dates</CtaLink>
            {messenger ? (
              <CtaLink href={messenger} variant="secondary">
                Message on Facebook
              </CtaLink>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading eyebrow="Contact" title="Talk to TEN29 directly" align="center" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <ContactCard
            title="Call or text"
            description={phoneDisplay}
            href={`tel:${phoneE164}`}
            icon="☎"
          />
          {messenger ? (
            <ContactCard
              title="Messenger"
              description="Chat with TEN29 on Facebook"
              href={messenger}
              icon="✉"
            />
          ) : null}
          {maps ? (
            <ContactCard
              title="Google Maps"
              description="Get directions to TEN29"
              href={maps}
              icon="📍"
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
