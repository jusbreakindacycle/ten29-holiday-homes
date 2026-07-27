# 05 — Owner Approval Matrix (Claim Register)

This document is the human-readable mirror of the machine-enforced claim registry at `src/content/claims.ts`. Every claim below carries the same `id`, `status`, and fields as the code. If this document and the code ever disagree, the code's status is authoritative for what actually renders — update this file to match immediately.

## Claim status definitions

| Status | Meaning |
|---|---|
| `VERIFIED` | Confirmed by a supplied primary business record, live official profile, owner-provided original asset, or direct owner approval with a date. |
| `OWNER_REPORTED` | Stated by the owner or authorized manager but not independently documented. |
| `PROPOSED_PENDING_APPROVAL` | Developed by this project as a recommended operating value or public statement, but not yet approved. |
| `UNVERIFIED` | Mentioned, inferred, or observed but insufficiently supported for publication. |
| `APPROVED_FOR_PUBLICATION` | Explicitly approved by the owner for website publication, with approver and date recorded. |
| `REJECTED_OR_SUPERSEDED` | Considered but rejected, replaced, or no longer valid. |

## Public-claim gate

The public application must never render a `PROPOSED_PENDING_APPROVAL` or `UNVERIFIED` claim as established fact. This is implemented in `src/content/claims.ts` (`isPublicClaim`, `getPublicClaim`) and covered by automated tests in `tests/unit/claims.test.ts`. Public routes only render `VERIFIED` and `APPROVED_FOR_PUBLICATION` claims; every other status renders the applicable fallback state from [[13_CONTENT_AND_CLAIM_STANDARD]] instead.

## Claim register

| Claim ID | Field / category | Proposed or factual value | Status | Source / evidence | Owner approver | Approval date | Where it may appear | Notes | Superseded by |
|---|---|---|---|---|---|---|---|---|---|
| CLM-BIZ-001 | Public brand name | TEN29 Holiday Homes | VERIFIED | Owner-supplied brand name, matches Facebook Page | — | 2026-07-27 | All public pages | — | — |
| CLM-BIZ-002 | Public phone display | 0961 586 8106 | VERIFIED | Owner-supplied contact number | — | 2026-07-27 | Header, footer, contact page | E.164 link format +639615868106 | — |
| CLM-BIZ-003 | Map location (general) | Holiday Homes subdivision, Barangay Biclatan, General Trias, Cavite 4107 | VERIFIED | Owner-supplied, matches Google Maps listing area | — | 2026-07-27 | Location, footer | Exact block/lot withheld from routine public display | — |
| CLM-BIZ-004 | Precise map record | Block 10, Lot 29 | VERIFIED (restricted) | Owner-supplied | — | 2026-07-27 | Not auto-published; disclosed manually by owner as needed | Do not render on public routes by default | — |
| CLM-BIZ-005 | Proposed domain | ten29holidayhomes.com | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Internal docs only until purchased | Availability unconfirmed | — |
| CLM-BIZ-006 | Proposed business email | bookings@ten29holidayhomes.com | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Internal docs only until mailbox exists | Not active | — |
| CLM-POS-001 | Positioning statement | "modern private whole-home stay ... for small families and groups" | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | See [[04_BUSINESS_POSITIONING]] | — |
| CLM-POS-002 | Tagline | "Comfortable stays. Memorable moments. A place that feels like home." | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Fallback hero copy used publicly instead | — |
| CLM-POS-003 | Approved location language | "Located in Biclatan, General Trias, with road access toward Amadeo and Tagaytay." | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Fallback location copy used publicly instead | — |
| CLM-POS-004 | Hero headline | "Your private place to rest, reconnect, and feel at home." | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Fallback: "Discover TEN29 Holiday Homes in Biclatan, General Trias." | — |
| CLM-POS-005 | Hero supporting copy | "A modern holiday-home stay in Biclatan, General Trias for small families and groups." | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CAP-001 | Base overnight capacity | 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CAP-002 | Maximum overnight capacity | 8 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CAP-003 | Maximum total persons on property | 10 | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Day visitors included | — |
| CLM-CAP-004 | Indoor parking capacity | 1 vehicle | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Additional vehicles subject to subdivision rules | — |
| CLM-CAP-005 | Minimum lead-guest age | 21 | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CAP-006 | Minimum stay | 1 night | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-001 | Sun–Thu rate | PHP 4,499 up to 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-002 | Friday rate | PHP 4,999 up to 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-003 | Saturday rate | PHP 5,999 up to 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-004 | Public holiday rate | PHP 6,499 up to 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-005 | Peak holiday rate | from PHP 6,999 up to 6 guests | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-006 | Additional guest fee | PHP 500 each, max 2 | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-007 | Security deposit | PHP 2,000 refundable | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RATE-008 | Early check-in / late check-out fee | PHP 500 per approved hour | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PROMO-001 | 2-night discount | PHP 500 off total | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PROMO-002 | 3+ night discount | 10% off accommodation | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PROMO-003 | Launch rate | PHP 3,999 weekday, first 10 bookings | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Optional | — |
| CLM-PROMO-004 | Returning guest discount | 5% off | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-HOURS-001 | Booking-enquiry support hours | 8:00 AM–9:00 PM daily | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Replaces "Always open" | — |
| CLM-HOURS-002 | Check-in time | 2:00 PM | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-HOURS-003 | Check-out time | 11:00 AM | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-HOURS-004 | Quiet hours | 10:00 PM–7:00 AM | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PAY-001 | Payment schedule (>3 days) | 50% deposit | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PAY-002 | Payment schedule (≤3 days / same-day) | full payment | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-PAY-003 | Payment channels | GCash, bank transfer | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Account details never in source control | — |
| CLM-CXL-001 | Cancellation ≥14 days | 90% refund or free reschedule | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CXL-002 | Cancellation 7–13 days | 50% refund or free reschedule | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-CXL-003 | Cancellation <7 days / no-show | non-refundable | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | — | — |
| CLM-RULE-001 | House rules set | see [[07_INFORMATION_ARCHITECTURE]] / policies page | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Owner preview only | Full list in claims.ts | — |
| CLM-FACT-001..027 | Bedrooms, beds, bathrooms, occupancy safety limit, parking, Wi-Fi, aircon, kitchen, TV, pool access, pets, events, towels, accessibility, CCTV locations, fire extinguisher, smoke detectors, first-aid kit, emergency exits, backup utilities, permits (business, barangay, BIR, DTI/SEC, HOA short-stay, tourism accreditation), operator authorization, payment-account holder, photo rights | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Blocking items for full launch — see [[24_ASSET_REQUIREMENTS]] | — |

## Process

1. New proposed values are added to `src/content/claims.ts` with status `PROPOSED_PENDING_APPROVAL` and mirrored here.
2. The owner reviews proposed values at `/admin/owner-preview` (development/authenticated only).
3. On approval, the developer updates the claim's status to `APPROVED_FOR_PUBLICATION`, records `approvedBy` and `approvedAt`, and the value becomes eligible for public rendering.
4. Rejected values move to `REJECTED_OR_SUPERSEDED` and reference the superseding claim ID where applicable.
5. This file is updated in the same change set as `src/content/claims.ts`.
