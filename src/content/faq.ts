import { CLAIMS, getPublicClaimOrFallback } from "@/content/claims";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import type { FaqItem } from "@/components/ui/FaqAccordion";

export function getFaqItems(): FaqItem[] {
  const location = getPublicClaimOrFallback(CLAIMS.generalLocation, FALLBACK_COPY.locationDetail);

  return [
    {
      question: "Does submitting the enquiry form reserve my dates?",
      answer:
        "No. Submitting the form sends a booking enquiry only. TEN29 confirms availability, price, and payment instructions manually before anything is reserved.",
    },
    {
      question: "Where exactly is TEN29 Holiday Homes located?",
      answer: `TEN29 is located in ${location}. It is not located in Tagaytay; the area has road access toward Amadeo and Tagaytay.`,
    },
    {
      question: "How do I pay for my stay?",
      answer:
        "Payment instructions are shared directly by TEN29 after your enquiry is reviewed and your dates are manually confirmed. The website does not process payments.",
    },
    {
      question: "What are the check-in and check-out times?",
      answer: FALLBACK_COPY.policies,
    },
    {
      question: "Can we bring pets or host an event?",
      answer: FALLBACK_COPY.amenities,
    },
    {
      question: "Can I book instantly through the website?",
      answer:
        "Not yet. Option 1 of the TEN29 website is an enquiry system. TEN29 replies directly to confirm availability before any booking is treated as settled.",
    },
    {
      question: "How do I contact TEN29 directly?",
      answer:
        "You can call, message TEN29 on Facebook Messenger, or use the enquiry form on this website — all listed on the Contact page.",
    },
  ];
}
