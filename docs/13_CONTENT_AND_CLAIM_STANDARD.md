# 13 — Content and Claim Standard

## Voice

Calm, trustworthy, welcoming, clear, locally grounded. Not exaggerated. Not luxury-for-the-sake-of-luxury. Not generic travel copy.

## Required distinctions

Always distinguish, in copy and in code:

- **Enquiry versus reservation** — a submitted form is a request, never a booking.
- **Quoted price versus approved public rate** — only `APPROVED_FOR_PUBLICATION`/`VERIFIED` rates render as "our rates"; anything else is a fallback ("request a verified quotation").
- **Submitted proof versus verified payment** — not applicable in Option 1 since no payment evidence is accepted at all, but the distinction still governs how future payment copy must read.
- **General Trias location versus Tagaytay access** — the property is in General Trias; Tagaytay is only ever "road access toward," never the stated location.
- **Proposed amenity versus working amenity** — unapproved amenities never appear as bullet points implying they exist.
- **Follower count versus completed-stay review evidence** — Facebook follower counts are never presented as guest satisfaction evidence.

## Prohibited copy

Never publish:

- "best staycation", "number one"
- "luxury" without owner approval and real evidence
- "near all Tagaytay attractions"
- "minutes away" without a verified, owner-approved travel time
- "always available"
- "instant confirmation"
- "secure payment" when no gateway exists
- fake testimonials, fake ratings, fake recent bookings, fake scarcity, fake guest names

## Temporary content states

Reusable components render polished public language instead of internal terminology:

| Internal state | Public-facing copy |
|---|---|
| No approved rates | "Rates are currently being finalized. Send your preferred dates and group details to receive a verified quotation." |
| No approved availability calendar | "Availability is confirmed manually. Your enquiry does not reserve a date." |
| No approved amenity list | "The complete amenity list will be published after final property verification." |
| No approved policies | "Final stay policies are being reviewed. TEN29 will provide the applicable rules before payment." |
| Gallery assets pending | "Property photos are being finalized. Contact TEN29 for the latest available images." |

Guests never see the words "PROPOSED_PENDING_APPROVAL," "UNVERIFIED," or claim IDs. Those are internal/admin vocabulary only, visible at `/admin/claims` and `/admin/owner-preview`.
