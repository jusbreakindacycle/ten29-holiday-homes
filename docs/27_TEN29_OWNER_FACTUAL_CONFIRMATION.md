# 27 — TEN29 Owner Factual Confirmation

**For:** The actual TEN29 Holiday Homes owner or authorized booking manager.
**Not for:** Developers or the Project Steward — this is a confirmation sheet, not a design document.

## 0. Confirmation received — 2026-07-28

**Source:** Owner-supplied TEN29 property and promotional description received through the Project Steward on 2026-07-28.

The actual owner supplied a property and promotional description covering the items marked
**Owner approved for publication** or **Owner approved with restricted public wording** in the
tables below. This reconciliation does **not** re-ask any question already answered here — it
records the answer received and its publication classification. No new questionnaire was sent to
the owner. Rates, capacity numbers, payment terms, cancellation/refund rules, house-rule
enforcement, permits, HOA/subdivision authority, official payment account, Instagram URL, and
active business/privacy email remain **Unresolved**; final Facebook and Google Maps URLs remain
**Unresolved** even though both accounts are now confirmed to exist. See
[[05_OWNER_APPROVAL_MATRIX]] for the corresponding claim IDs and
[[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]] for what still requires the owner's final
sign-off. Production launch is **not** authorized by this reconciliation.

### Classification key

| Classification | Meaning |
|---|---|
| Owner approved for publication | Confirmed by the owner and rendered on public routes as-is (`APPROVED_FOR_PUBLICATION` in `src/content/claims.ts`). |
| Owner approved with restricted public wording | Confirmed by the owner, but only a specific safe phrasing is published — quantities, locations, or guarantees are withheld. |
| Steward-approved proposal still awaiting owner acceptance | Unchanged by this reconciliation — still `STEWARD_APPROVED_FOR_PROTOTYPE`, owner-preview only. |
| Unresolved | Not answered in the owner's description; still blank. |
| Must remain unpublished | Answered or partially answered, but the specific value (e.g. an account number) must never enter source control or public copy regardless of approval status. |

### What the owner confirmed (summary)

| Item | Classification | Claim ID(s) |
|---|---|---|
| Accommodation model (entire private house, one guest group, 1–3 bedroom access) | Owner approved for publication | CLM-FACT-030 |
| Stay duration options (daily/weekly/monthly enquiries; long-stay discount via verified quotation) | Owner approved for publication | CLM-FACT-031 |
| Number of bedrooms (three) | Owner approved for publication | CLM-FACT-001 |
| Bed type per bedroom (queen / twins / double-deck) | Owner approved with restricted public wording (no dimensions or bed capacity stated) | CLM-FACT-002 |
| Number of bathrooms (two, one with hot-and-cold shower and LED vanity mirror) | Owner approved for publication | CLM-FACT-003 |
| Safe overnight/total occupancy | Unresolved | CLM-FACT-004 |
| Parking availability (private gated parking exists) | Owner approved with restricted public wording (no vehicle count) | CLM-FACT-032 |
| Parking capacity (number of vehicles) | Unresolved | CLM-FACT-005 |
| Wi-Fi | Owner approved with restricted public wording (availability only, no speed claim) | CLM-FACT-006 |
| Air-conditioning (all bedrooms + ground-floor living/dining/kitchen) | Owner approved for publication | CLM-FACT-007 |
| Kitchen appliances and dining items | Owner approved for publication | CLM-FACT-008 |
| Television/entertainment (Smart TV, YouTube/Netflix apps, indoor games) | Owner approved with restricted public wording (no subscription/account included) | CLM-FACT-009 |
| Guest amenities and toiletries | Owner approved for publication | CLM-FACT-013 |
| Property areas/features (lanai, modern interior, glass stair railings, 3-mode lighting) | Owner approved for publication | CLM-FACT-034 |
| CCTV presence | Owner approved with restricted public wording (existence only, no locations/coverage) | CLM-FACT-033 |
| CCTV locations/coverage | Unresolved | CLM-FACT-015 |
| Fire extinguisher | Owner approved for publication | CLM-FACT-016 |
| Smoke alarm | Owner approved for publication | CLM-FACT-017 |
| Surroundings (Holiday Homes subdivision, open surroundings; optional walking/cycling note) | Owner approved with restricted public wording (no silence/safety/security guarantee) | CLM-LOC-001, CLM-LOC-002 |
| Approximate travel time toward Tagaytay / from Governor's Drive CALAX access | Owner approved with restricted public wording (qualified estimate only, never guaranteed) | CLM-LOC-003, CLM-LOC-004 |
| Business name, public phone, general location | Already `VERIFIED`, reconfirmed by this description — no change | CLM-BIZ-001, CLM-BIZ-002, CLM-BIZ-003 |
| Facebook Page existence | Owner approved for publication (existence only) — final URL still Unresolved | — (see §11) |
| Google Maps listing existence | Owner approved for publication (existence only) — final URL still Unresolved | — (see §11) |
| Rates, capacity numbers, payment terms, cancellation rules, house-rule enforcement | Steward-approved proposal still awaiting owner acceptance (unchanged) | See [[05_OWNER_APPROVAL_MATRIX]] |
| Permits, HOA authority, payment-account holder, photo rights, first-aid kit, emergency exits, backup utilities, accessibility, pool access, pets, events | Unresolved | See [[05_OWNER_APPROVAL_MATRIX]] |
| Instagram URL, active business email, active privacy-contact email, exact block/lot public disclosure, actual original photos | Unresolved / Must remain unpublished where applicable | — |

## Why you're reading this

The Project Steward has already done the work of designing the website: the page structure, the proposed rates, the proposed rules, the payment process, and the booking-enquiry workflow (see [[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]]). You are **not** being asked to design anything.

Your job is only to:

- confirm the real facts about the property;
- approve, revise, or reject the proposed prices and rules;
- confirm who is legally authorized to run this business;
- supply or authorize the photos and accounts the site will use;
- and, later, authorize the site to go live.

Nothing you approve here goes public by itself. A developer must still move each item into "approved for publication" afterward, and a final launch review happens separately once you've seen the finished preview.

---

## 1. Property identity

| Field | Currently shown as | Correct | Needs revision | Final correct value | Owner initials | Date |
|---|---|---|---|---|---|---|
| Business name | TEN29 Holiday Homes | ☑ | ☐ | TEN29 Holiday Homes | — | 2026-07-28 |
| Public telephone | 0961 586 8106 | ☑ | ☐ | 0961 586 8106 | — | 2026-07-28 |
| General location (public) | Holiday Homes, Biclatan, General Trias, Cavite | ☑ | ☐ | Holiday Homes, Biclatan, General Trias, Cavite | — | 2026-07-28 |
| Proposed domain | ten29holidayhomes.com | ☐ | ☐ | Unresolved — no domain decision in the supplied description | | |

Business name, phone, and general location were reconfirmed (not newly changed) by the owner-supplied description of 2026-07-28 — no code or claim change was needed for these three since they were already `VERIFIED`. "Owner initials" is recorded as "—" because this reconciliation was received as a written description through the Project Steward, not a signed copy of this sheet; the owner's name/role/date belong in section 12 once the owner reviews the finished preview directly.

The full block-and-lot address is **not** shown here as the recommended public address and will not be published without your separate, explicit instruction.

---

## 2. Actual property facts

Rows the owner has now answered (2026-07-28) are filled in below, with the resulting claim ID and
publication classification. Rows still blank were not part of the supplied description and remain
open — see [[24_ASSET_REQUIREMENTS]].

| Item | Current state | Current recommendation | Owner-confirmed value | Evidence/photo supplied? | May be published? | Owner initials |
|---|---|---|---|---|---|---|
| Number of bedrooms | Owner approved for publication (CLM-FACT-001) | — | Three bedrooms | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Bed type and quantity per bedroom | Owner approved with restricted wording (CLM-FACT-002) | — | Bedroom 1: queen-size bed. Bedroom 2: twin beds. Bedroom 3: double-deck (bunk) bed. | ☐ Yes ☑ No | ☑ Yes ☐ No (no mattress dimensions, bed count, or occupancy inferred) | — |
| Number of bathrooms | Owner approved for publication (CLM-FACT-003) | — | Two bathrooms; one with hot-and-cold shower and LED vanity mirror | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Safe overnight capacity | Unresolved (CLM-FACT-004) | 6 base / 8 max (planning target only) | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Maximum total persons (incl. visitors) | Unresolved (CLM-FACT-004) | 10 (planning target only) | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Indoor parking capacity | Unresolved (CLM-FACT-005) | 1 vehicle (planning target only) | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Private gated parking — availability (not capacity) | Owner approved with restricted wording (CLM-FACT-032) | — | Private gated parking is available inside the property | ☐ Yes ☑ No | ☑ Yes ☐ No (no vehicle count/coverage) | — |
| Additional vehicle arrangements | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Kitchen appliances and cooking facilities | Owner approved for publication (CLM-FACT-008) | — | Induction cooker, rice cooker, electric kettle, cookware, cooking/dining utensils, dinner plates, drinking glasses, two-door refrigerator, kitchen and dining area | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Wi-Fi | Owner approved with restricted wording (CLM-FACT-006) | — | Wi-Fi is available | ☐ Yes ☑ No | ☑ Yes ☐ No (no "fast Wi-Fi" or speed claim) | — |
| Air-conditioning | Owner approved for publication (CLM-FACT-007) | — | All three bedrooms air-conditioned; ground-floor living, dining, and kitchen areas air-conditioned | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Television or entertainment | Owner approved with restricted wording (CLM-FACT-009) | — | Smart TV with YouTube and Netflix apps available; indoor games (cards, chess, darts, Uno, mini tennis) | ☐ Yes ☑ No | ☑ Yes ☐ No (no subscription/account included) | — |
| Towels | Owner approved for publication (CLM-FACT-013) | — | Bath towels included | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Toiletries | Owner approved for publication (CLM-FACT-013) | — | Shower bath gel, shampoo, dental kit (toothbrush and toothpaste), dishwashing liquid, complimentary coffee and biscuits | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Dining capacity | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Subdivision or shared amenities | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Pet suitability | Unresolved (property fact) | No pets during initial operations (proposed policy, not a fact) | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Accessibility limitations | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| CCTV — presence | Owner approved with restricted wording (CLM-FACT-033) | — | CCTV is present on the property | ☐ Yes ☑ No | ☑ Yes ☐ No (existence only) | — |
| CCTV — exact locations/coverage | Unresolved (CLM-FACT-015) | Proposed wording: entrances and parking only, no indoor cameras | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Fire extinguishers | Owner approved for publication (CLM-FACT-016) | — | A fire extinguisher is present on the property | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Smoke detectors | Owner approved for publication (CLM-FACT-017) | — | A smoke alarm is present on the property | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| First-aid kit | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Emergency exits | Unresolved | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Accommodation model (whole house / one guest group / 1–3 bedroom access) | Owner approved for publication (CLM-FACT-030) | — | Entire private house; one related guest group at a time; guests request access to one, two, or three bedrooms; bedrooms outside the selection may remain unavailable or locked | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Stay duration options | Owner approved for publication (CLM-FACT-031) | — | Daily, weekly, and monthly enquiries accepted; long-stay discount available via verified quotation (no amount stated) | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Property areas and features | Owner approved for publication (CLM-FACT-034) | — | Private lanai (outdoor patio), modern interior, glass stair railings, adjustable lighting with three light modes | ☐ Yes ☑ No | ☑ Yes ☐ No | — |
| Surroundings | Owner approved with restricted wording (CLM-LOC-001, CLM-LOC-002) | — | TEN29 is located inside Holiday Homes subdivision, with open surroundings; guests may enjoy walking or light cycling, subject to subdivision rules | ☐ Yes ☑ No | ☑ Yes ☐ No (no silence/safety/security guarantee) | — |
| Approximate travel times | Owner approved with restricted wording (CLM-LOC-003, CLM-LOC-004) | — | ~30 min toward Tagaytay; ~10 min from Governor's Drive CALAX access (both "depending on route and traffic") | ☐ Yes ☑ No | ☑ Yes ☐ No (qualified estimate, never a guarantee) | — |
| Backup water | Not yet supplied | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |
| Backup electricity | Not yet supplied | — | | ☐ Yes ☐ No | ☐ Yes ☐ No | |

---

## 3. Proposed capacity and operating schedule

These are steward-approved planning recommendations only — **not yet publicly approved.**

| Item | Proposed value | Approve as proposed | Revise | Reject | Final owner value | Owner initials |
|---|---|---|---|---|---|---|
| Base overnight guests | 6 | ☐ | ☐ | ☐ | | |
| Maximum overnight guests | 8 | ☐ | ☐ | ☐ | | |
| Maximum total persons | 10 | ☐ | ☐ | ☐ | | |
| Children count toward occupancy | Yes | ☐ | ☐ | ☐ | | |
| Day visitors within total-person limit | Yes | ☐ | ☐ | ☐ | | |
| Proposed indoor parking | 1 vehicle | ☐ | ☐ | ☐ | | |
| Minimum lead-guest age | 21 | ☐ | ☐ | ☐ | | |
| Minimum stay | 1 night | ☐ | ☐ | ☐ | | |
| Check-in | 2:00 PM | ☐ | ☐ | ☐ | | |
| Check-out | 11:00 AM | ☐ | ☐ | ☐ | | |
| Quiet hours | 10:00 PM – 7:00 AM | ☐ | ☐ | ☐ | | |
| Booking-enquiry hours | 8:00 AM – 9:00 PM daily | ☐ | ☐ | ☐ | | |

---

## 4. Proposed rate card

| Item | Proposed value | Approve | Revised amount | Not offered | Notes | Owner initials |
|---|---|---|---|---|---|---|
| Sunday to Thursday | PHP 4,499 (up to 6 guests) | ☐ | | ☐ | | |
| Friday | PHP 4,999 (up to 6 guests) | ☐ | | ☐ | | |
| Saturday | PHP 5,999 (up to 6 guests) | ☐ | | ☐ | | |
| Declared public holiday | PHP 6,499 (up to 6 guests) | ☐ | | ☐ | | |
| Peak holiday period | From PHP 6,999 (up to 6 guests) | ☐ | | ☐ | | |
| Additional overnight guest | PHP 500 each (max 2) | ☐ | | ☐ | | |
| Refundable security deposit | PHP 2,000 | ☐ | | ☐ | | |
| Early check-in | PHP 500 per approved hour | ☐ | | ☐ | | |
| Late checkout | PHP 500 per approved hour | ☐ | | ☐ | | |
| Excessive cleaning | Documented actual charge | ☐ | | ☐ | | |
| Lost key or access device | Documented replacement cost | ☐ | | ☐ | | |
| Damage | Documented repair or replacement cost | ☐ | | ☐ | | |

---

## 5. Proposed promotions

| Item | Proposed value | Approve | Revise | Reject | Validity or restrictions | Owner initials |
|---|---|---|---|---|---|---|
| Two consecutive nights | PHP 500 off total accommodation | ☐ | ☐ | ☐ | | |
| Three or more nights | 10% off accommodation | ☐ | ☐ | ☐ | | |
| First-ten-completed-bookings weekday launch rate (optional) | PHP 3,999 | ☐ | ☐ | ☐ | | |
| Returning verified guest | 5% accommodation discount | ☐ | ☐ | ☐ | | |

---

## 6. Payment process

**Proposed model:**

- More than three days before arrival: 50% reservation deposit.
- Within three days of arrival: full accommodation payment.
- Same-day request: full payment before confirmation.
- Remaining balance due three days before check-in.
- Initial payment channels: GCash and bank transfer.
- Approved cash may be accepted only for an authorized balance or security deposit.
- A payment screenshot is submitted for verification, not automatically treated as paid.
- No payment details are sent until the enquiry has been reviewed.

**Please confirm the following.** Do not write complete account numbers in this document.

| Question | Owner answer |
|---|---|
| Accepted payment channels | |
| Official account-holder name | |
| GCash: personal or business account? | |
| Bank name | |
| Who verifies incoming payments? | |
| Who may approve refunds? | |
| Will receipts or invoices be issued? | |

---

## 7. Cancellation, rescheduling, and refund commitments

| Item | Proposed value | Approve as proposed | Revise | Reject | Final owner wording | Owner initials |
|---|---|---|---|---|---|---|
| 14 days or more before check-in | 90% accommodation refund or one free reschedule | ☐ | ☐ | ☐ | | |
| 7 to 13 days before check-in | 50% accommodation refund or one free reschedule | ☐ | ☐ | ☐ | | |
| Less than 7 days before check-in | Non-refundable | ☐ | ☐ | ☐ | | |
| No-show | Non-refundable | ☐ | ☐ | ☐ | | |
| Early departure | Unused nights non-refundable | ☐ | ☐ | ☐ | | |
| Reschedule allowance | One reschedule per booking | ☐ | ☐ | ☐ | | |
| Rescheduled-stay window | Used within 90 days | ☐ | ☐ | ☐ | | |
| Higher-priced replacement date | Requires payment of the difference | ☐ | ☐ | ☐ | | |
| Lower-priced replacement date | No automatic cash refund | ☐ | ☐ | ☐ | | |
| Official safety or access restriction | Booking credit and one fee-free reschedule | ☐ | ☐ | ☐ | | |
| TEN29 operational cancellation | Full refund | ☐ | ☐ | ☐ | | |

---

## 8. House rules

Historical rule contents removed on 2026-10-15 under the actual OWNER non-storage instruction. Only external delivery status may be recorded by the application.

## 9. Business authority and compliance

| Item | Available | Pending | Not applicable (explain) | Evidence reviewed by | Blocks public launch | Owner initials |
|---|---|---|---|---|---|---|
| Property owner or authorized operator identity | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Written authority to rent the property | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Registered business or trade name | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| DTI or SEC status (where applicable) | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| BIR registration status | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| General Trias business permit | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Barangay clearance | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Subdivision/HOA permission for transient stays | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Tourism registration or accreditation | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Receipt or invoice process | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |
| Emergency contact responsible for guests | ☐ | ☐ | ☐ | | ☐ Yes ☐ No | |

This document does not draw any legal conclusion from these answers.

---

## 10. Photographs and brand assets

| Asset | Supplied | Still needed | Owned by TEN29 | Authorized for website use | Contains identifiable people | Owner initials |
|---|---|---|---|---|---|---|
| Official logo | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Exterior | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Entrance | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Parking | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Living room | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Kitchen and dining | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Every bedroom | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Every bed arrangement | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Every bathroom | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Actual amenities | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Safety equipment | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Optional walkthrough video | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Social-sharing image | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Favicon | ☐ | ☐ | ☐ | ☐ | ☐ | |

---

## 11. Official accounts and links

| Account/link | Owner-confirmed value |
|---|---|
| Facebook Page — existence | Owner approved for publication: an official Facebook Page exists |
| Facebook Page — final URL | Unresolved — exact URL not supplied; preserve the exact existing URL already configured in the repository (`NEXT_PUBLIC_FACEBOOK_URL`) if any, do not invent one |
| Instagram URL | Unresolved |
| Google Maps listing — existence | Owner approved for publication: an official Google Maps listing exists |
| Google Maps listing — final share URL | Unresolved — exact URL not supplied; preserve the exact existing URL already configured in the repository (`NEXT_PUBLIC_GOOGLE_MAPS_URL`) if any, do not invent one |
| Official business email | Unresolved (`bookings@ten29holidayhomes.com` remains a proposal only, not active) |
| Privacy contact email | Unresolved |
| Cloudflare account owner | Unresolved |
| Proposed domain owner | Unresolved |
| Vercel account owner | Unresolved |
| Supabase account owner | Unresolved |
| Resend account owner | Unresolved |

All production accounts above must belong to TEN29 or the actual owner — not solely to the developer.
Existing Facebook and Google profile inconsistencies (category, "Always Open", food-business
metadata, etc.) are tracked in [[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]] §6 and were
not changed by this reconciliation — no external account was accessed or modified.

---

## 12. Final owner confirmations

1. ☐ The property facts are accurate.
2. ☐ The rates and charges are accepted.
3. ☐ The payment and refund rules are accepted.
4. ☐ The house rules are accepted.
5. ☐ The photographs and branding are owned or authorized.
6. ☐ The official account and contact details are correct.
7. ☐ TEN29 is authorized to operate and accept booking enquiries.
8. ☐ The owner authorizes the approved information to be prepared for public website publication.

| Field | Value |
|---|---|
| Owner or authorized manager name | |
| Role | |
| Signature or written-chat confirmation reference | |
| Confirmation date | |
| Notes | |

Production-launch authorization is **not** requested here. That happens only after you review the final deployed preview.
