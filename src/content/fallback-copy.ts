/**
 * Public-facing copy for states where no owner-approved claim exists yet.
 * Transparent, TEN29-specific, never generic filler. See docs/13_CONTENT_AND_CLAIM_STANDARD.md.
 */
export const FALLBACK_COPY = {
  rates:
    "Rates are currently being finalized. Send your preferred dates and group details to receive a verified quotation.",
  availability: "Availability is confirmed manually. Your enquiry does not reserve a date.",
  amenities: "The complete amenity list will be published after final property verification.",
  policies:
    "Final stay policies are being reviewed. TEN29 will provide the applicable rules before payment.",
  gallery: "Property photos are being finalized. Contact TEN29 for the latest available images.",
  positioning: "Discover TEN29 Holiday Homes in Biclatan, General Trias.",
  locationDetail: "Located in Biclatan, General Trias, Cavite.",
} as const;

export const NON_RESERVATION_NOTICE =
  "Dates shown or requested through this website are subject to manual confirmation. Submitting an enquiry does not place a hold or create a reservation.";

export const ENQUIRY_SUCCESS_COPY = {
  heading: "Your enquiry has been received.",
  body: "This is a request, not a reservation. TEN29 will reply with verified availability, price, and payment instructions.",
  reminder: "Please do not send any payment until TEN29 has confirmed the details with you directly.",
} as const;
