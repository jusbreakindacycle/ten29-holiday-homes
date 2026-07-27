import { getBrandName, getPhoneE164, getPublicAddress, getSiteUrl } from "@/lib/site-config";

/**
 * Conservative LocalBusiness structured data built only from public claims.
 * No ratings, reviews, prices, or occupancy — see docs/17_SEO_AND_ANALYTICS.md.
 */
export function LocalBusinessJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: getBrandName(),
    url: getSiteUrl(),
    telephone: getPhoneE164(),
    address: {
      "@type": "PostalAddress",
      addressLocality: "General Trias",
      addressRegion: "Cavite",
      postalCode: "4107",
      addressCountry: "PH",
    },
    description: getPublicAddress(),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
