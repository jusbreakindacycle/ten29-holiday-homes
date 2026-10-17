import { CLAIMS, getPublicClaimOrFallback } from "@/content/claims";
import { FALLBACK_COPY } from "@/content/fallback-copy";
import type { FaqItem } from "@/components/ui/FaqAccordion";

export function getFaqItems(): FaqItem[] {
  const location = getPublicClaimOrFallback(CLAIMS.generalLocation, FALLBACK_COPY.locationDetail);
  const accommodationModel = getPublicClaimOrFallback(
    CLAIMS.accommodationModel,
    "The whole house remains private for one guest group. Bedroom access is arranged according to the selected one-, two-, or three-bedroom stay option."
  );

  return [
    {
      question: "Does submitting the enquiry form reserve my dates?",
      answer:
        "No. The calendar displays property-wide availability and published package prices, but submitting a request does not hold dates. Final confirmation requires an owner-issued quotation, independently verified required down payment and successful database availability checks.",
    },
    {
      question: "Do we rent the whole house, or just a room?",
      answer: `${accommodationModel} TEN29 is not rented out as individually booked rooms.`,
    },
    {
      question: "Where exactly is TEN29 Holiday Homes located?",
      answer: `TEN29 is located in ${location}. It is not located in Tagaytay; the area has road access toward Amadeo and Tagaytay.`,
    },
    {
      question: "How do I pay for my stay?",
      answer:
        "TEN29 provides applicable owner-approved quotation and payment conditions directly after reviewing your request. Do not send payment before those details are provided. The website does not process payments or automatically verify receipt.",
    },
    {
      question: "What are the check-in and check-out times?",
      answer: "Check-in is from 3:00 PM and checkout is before 12:00 PM, Asia/Manila. Early arrival, late checkout and any associated arrangements require separate owner approval.",
    },
    {
      question: "Can we bring pets or host an event?",
      answer: FALLBACK_COPY.amenities,
    },
    {
      question: "Can I book instantly through the website?",
      answer:
        "No. You can view availability and published nightly estimates and submit a request. Dates are not reserved until the owner completes the quotation, independently verified required payment and protected confirmation process.",
    },
    {
      question: "How do I contact TEN29 directly?",
      answer:
        "You can call, message TEN29 on Facebook Messenger, or use the enquiry form on this website — all listed on the Contact page.",
    },
  ];
}
