# 05 — Owner Approval Matrix (Claim Register)

This document is the human-readable mirror of the machine-enforced claim registry at `src/content/claims.ts`. Every claim below carries the same `id`, `status`, and fields as the code. If this document and the code ever disagree, the code's status is authoritative for what actually renders — update this file to match immediately.

## Claim status definitions

| Status | Meaning |
|---|---|
| `VERIFIED` | Confirmed by a supplied primary business record, live official profile, owner-provided original asset, or direct owner approval with a date. |
| `OWNER_REPORTED` | Stated by the owner or authorized manager but not independently documented. |
| `PROPOSED_PENDING_APPROVAL` | Developed by this project as a recommended operating value or public statement, but not yet approved. |
| `STEWARD_APPROVED_FOR_PROTOTYPE` | Approved by the Project Steward (see [[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]]) for implementation, internal development, and authenticated owner preview, and as the recommended default. **Not** approved for public publication. Still requires actual TEN29 owner confirmation before it can become `APPROVED_FOR_PUBLICATION`, especially where it creates a factual or commercial business commitment. |
| `UNVERIFIED` | Mentioned, inferred, or observed but insufficiently supported for publication. |
| `APPROVED_FOR_PUBLICATION` | Explicitly approved by the owner for website publication, with approver and date recorded. |
| `REJECTED_OR_SUPERSEDED` | Considered but rejected, replaced, or no longer valid. |

## Public-claim gate

The public application must never render a `PROPOSED_PENDING_APPROVAL`, `STEWARD_APPROVED_FOR_PROTOTYPE`, or `UNVERIFIED` claim as established fact. This is implemented in `src/content/claims.ts` (`isPublicClaim`, `getPublicClaim`) and covered by automated tests in `tests/unit/claims.test.ts`. Public routes only render `VERIFIED` and `APPROVED_FOR_PUBLICATION` claims; every other status — including `STEWARD_APPROVED_FOR_PROTOTYPE` — renders the applicable fallback state from [[13_CONTENT_AND_CLAIM_STANDARD]] instead.

## Claim register

| Claim ID | Field / category | Proposed or factual value | Status | Source / evidence | Owner approver | Approval date | Where it may appear | Notes | Superseded by |
|---|---|---|---|---|---|---|---|---|---|
| CLM-BIZ-001 | Public brand name | TEN29 Holiday Homes | VERIFIED | Owner-supplied brand name, matches Facebook Page | — | 2026-07-27 | All public pages | — | — |
| CLM-BIZ-002 | Public phone display | 0961 586 8106 | VERIFIED | Owner-supplied contact number | — | 2026-07-27 | Header, footer, contact page | E.164 link format +639615868106 | — |
| CLM-BIZ-003 | Map location (general) | Holiday Homes subdivision, Barangay Biclatan, General Trias, Cavite 4107 | VERIFIED | Owner-supplied, matches Google Maps listing area | — | 2026-07-27 | Location, footer | Exact block/lot withheld from routine public display | — |
| CLM-BIZ-004 | Precise map record | Block 10, Lot 29 | VERIFIED (restricted) | Owner-supplied | — | 2026-07-27 | Not auto-published; disclosed manually by owner as needed | Do not render on public routes by default | — |
| CLM-BIZ-005 | Proposed domain | ten29holidayhomes.com | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Internal docs only until purchased | Availability unconfirmed | — |
| CLM-BIZ-006 | Proposed business email | bookings@ten29holidayhomes.com | PROPOSED_PENDING_APPROVAL | Project proposal | — | — | Internal docs only until mailbox exists | Not active | — |
| CLM-POS-001 | Positioning statement | "modern private whole-home stay ... for small families, groups of friends (barkada), and similar small groups" | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | See [[04_BUSINESS_POSITIONING]]; audience broadened per CLM-POS-001b | — |
| CLM-POS-002 | Tagline | "Comfortable stays. Memorable moments. A place that feels like home." | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Fallback hero copy used publicly instead | — |
| CLM-POS-003 | Approved location language | "Located in Biclatan, General Trias, with road access toward Amadeo and Tagaytay." | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Fallback location copy used publicly instead | — |
| CLM-POS-004 | Hero headline | "Your private place to rest, reconnect, and feel at home." | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Fallback: "Discover TEN29 Holiday Homes in Biclatan, General Trias." | — |
| CLM-POS-005 | Hero supporting copy | "A modern holiday-home stay in Biclatan, General Trias for small families, groups of friends (barkada), and similar small groups." | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Audience broadened per CLM-POS-001b | — |
| CLM-CAP-001 | Base overnight capacity | 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-CAP-002 | Maximum overnight capacity | 8 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-CAP-003 | Maximum total persons on property | 10 | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Day visitors included | — |
| CLM-CAP-004 | Indoor parking capacity | 1 vehicle | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Additional vehicles subject to subdivision rules | — |
| CLM-CAP-005 | Minimum lead-guest age | 21 | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-CAP-006 | Minimum stay | 1 night | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-001 | Sun–Thu rate | PHP 4,499 up to 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-002 | Friday rate | PHP 4,999 up to 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-003 | Saturday rate | PHP 5,999 up to 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-004 | Public holiday rate | PHP 6,499 up to 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-005 | Peak holiday rate | from PHP 6,999 up to 6 guests | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-006 | Additional guest fee | PHP 500 each, max 2 | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-007 | Security deposit | PHP 2,000 refundable | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-RATE-008 | Early check-in / late check-out fee | PHP 500 per approved hour | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PROMO-001 | 2-night discount | PHP 500 off total | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PROMO-002 | 3+ night discount | 10% off accommodation | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PROMO-003 | Launch rate | PHP 3,999 weekday, first 10 bookings | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Optional | — |
| CLM-PROMO-004 | Returning guest discount | 5% off | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-HOURS-001 | Booking-enquiry support hours | 8:00 AM–9:00 PM daily | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Replaces "Always open" | — |
| CLM-HOURS-002 | Check-in time | 2:00 PM | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-HOURS-003 | Check-out time | 11:00 AM | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-HOURS-004 | Quiet hours | 10:00 PM–7:00 AM | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PAY-001 | Payment schedule (>3 days) | 50% deposit | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PAY-002 | Payment schedule (≤3 days / same-day) | full payment | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-PAY-003 | Payment channels | GCash, bank transfer | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Account details never in source control | — |
| CLM-CXL-001 | Cancellation ≥14 days | 90% refund or free reschedule | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-CXL-002 | Cancellation 7–13 days | 50% refund or free reschedule | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | — | — |
| CLM-CXL-003 | Cancellation <7 days / no-show | non-refundable | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Same value applies to no-show (CLM-CXL-003b) | — |
| CLM-RULE-001 | House rules set | see [[07_INFORMATION_ARCHITECTURE]] / policies page | STEWARD_APPROVED_FOR_PROTOTYPE | Project Steward decision, docs/26 (2026-07-28) | — | — | Owner preview only | Full list in claims.ts | — |
| CLM-FACT-030 | Accommodation model | Entire private house, one guest group at a time, access to one/two/three bedrooms | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /, /property, /rates, /book | Never described as individually rented rooms | — |
| CLM-FACT-031 | Stay duration options | Daily, weekly, monthly enquiries accepted; long-stay discount via verified quotation | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /rates, /book, /availability | No discount amount stated | — |
| CLM-FACT-001 | Number of bedrooms | Three bedrooms | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | — | — |
| CLM-FACT-002 | Bed types and quantities | Bedroom 1 queen, Bedroom 2 twins, Bedroom 3 double-deck/bunk | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | No mattress dimensions, bed count, or occupancy inferred | — |
| CLM-FACT-003 | Number of bathrooms | Two bathrooms, one with hot-and-cold shower and LED vanity mirror | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | — | — |
| CLM-FACT-004 | Maximum safe occupancy | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Blocking item — see [[24_ASSET_REQUIREMENTS]] | — |
| CLM-FACT-005 | Parking capacity (vehicle count) | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Blocking item — see [[24_ASSET_REQUIREMENTS]] | — |
| CLM-FACT-006 | Wi-Fi | Wi-Fi is available | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | Availability only, no speed/"fast Wi-Fi" claim | — |
| CLM-FACT-007 | Air-conditioning | All 3 bedrooms + ground-floor living/dining/kitchen air-conditioned | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | — | — |
| CLM-FACT-008 | Kitchen appliances | Induction cooker, rice cooker, kettle, cookware, utensils, plates, glasses, 2-door fridge, dining area | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | — | — |
| CLM-FACT-009 | Television / entertainment | Smart TV with YouTube/Netflix apps; indoor games (cards, chess, darts, Uno, mini tennis) | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | No Netflix subscription/account claimed as included | — |
| CLM-FACT-010 | Pool or subdivision amenity access | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-011 | Pet approval (property fact) | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Distinct from the steward-proposed "no pets" policy (CLM-RULE-001) | — |
| CLM-FACT-012 | Event approval | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-013 | Guest amenities and toiletries | Bath gel, shampoo, towels, dental kit, dishwashing liquid, complimentary coffee and biscuits | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | Relabeled from "Towels and toiletries" | — |
| CLM-FACT-014 | Accessibility limitations | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-015 | CCTV locations and coverage | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Wording match to steward-proposed CCTV policy still unconfirmed | — |
| CLM-FACT-016 | Fire extinguisher | Present on the property | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property, /policies | — | — |
| CLM-FACT-017 | Smoke alarm | Present on the property | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property, /policies | — | — |
| CLM-FACT-018 | First-aid kit | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-019 | Emergency exits | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-020 | Backup water/electricity | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-021..026 | Permits (business, barangay, BIR, DTI/SEC, HOA short-stay, tourism accreditation) | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | Blocking items for full launch — see [[24_ASSET_REQUIREMENTS]] | — |
| CLM-FACT-027 | Owner/operator authorization | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-028 | Official payment-account holder | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly; must never enter source control | — | — |
| CLM-FACT-029 | Original photo rights | blank / not entered | UNVERIFIED | Not yet supplied | — | — | Not rendered publicly | — | — |
| CLM-FACT-032 | Parking availability (no capacity) | Private gated parking is available inside the property | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | No quantities, locations, coverage, or vehicle capacity — see CLM-FACT-005 | — |
| CLM-FACT-033 | CCTV presence | CCTV is present on the property | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property, /policies | Existence only — see CLM-FACT-015 | — |
| CLM-FACT-034 | Property areas and features | Private lanai, modern interior, glass stair railings, 3-mode adjustable lighting | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /property | — | — |
| CLM-LOC-001 | Surroundings | TEN29 is inside Holiday Homes subdivision, with open surroundings | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /location, /property | No silence/safety/security/superiority guarantee | — |
| CLM-LOC-002 | Surroundings — walking/cycling | Guests may enjoy walking or light cycling, subject to subdivision rules | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /location | — | — |
| CLM-LOC-003 | Approximate travel time toward Tagaytay | ~30 minutes toward Tagaytay, depending on route and traffic | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /location, / | Qualified estimate only; TEN29 remains located in General Trias, not Tagaytay | — |
| CLM-LOC-004 | Approximate travel time from Governor's Drive CALAX access | ~10 minutes from Governor's Drive CALAX access, depending on route and traffic | APPROVED_FOR_PUBLICATION | Owner-supplied TEN29 property description, docs/27 (2026-07-28) | — | 2026-07-28 | /location | Qualified estimate only | — |

## Process

1. New proposed values are added to `src/content/claims.ts` with status `PROPOSED_PENDING_APPROVAL` and mirrored here.
2. The Project Steward may approve a value for implementation and internal/owner preview by moving it to `STEWARD_APPROVED_FOR_PROTOTYPE` (recorded in [[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]]) — this does not authorize public publication.
3. The actual TEN29 owner reviews proposed and steward-approved values at `/admin/owner-preview` (authenticated only) and confirms, revises, or rejects them.
4. On owner approval, the developer updates the claim's status to `APPROVED_FOR_PUBLICATION`, records `approvedBy` and `approvedAt`, and the value becomes eligible for public rendering.
5. Rejected values move to `REJECTED_OR_SUPERSEDED` and reference the superseding claim ID where applicable.
6. This file is updated in the same change set as `src/content/claims.ts`.
