# 26 — Project Steward Decision and Owner Verification

Technical baseline commit: `d5368de`. Branch: `main`. This document records Project Steward product/implementation decisions on the existing [[05_OWNER_APPROVAL_MATRIX]] proposals, and separates them from what only the actual TEN29 owner can supply. It does not change code, `src/content/claims.ts`, or any other document. Production launch is not authorized by this document. Option 2 and Option 3 remain out of scope.

## 1. Authority model

- **Technical baseline:** commit `d5368de`, branch `main`.
- **Project Steward** (this document's approver): product, content-direction, UX, workflow, architecture, and prototype-value decision authority. Not the legal property owner or registered business owner.
- **TEN29 owner** (the actual owner/authorized business manager): sole authority for factual property claims, legal/business authority, official accounts, asset rights, and final production-launch authorization.
- Production launch is **not yet authorized**. Option 2 and Option 3 (per [[00_PROJECT_CHARTER]] scope, referenced throughout the doc set) remain outside current scope.

### Approval states used below

| Status | Meaning |
|---|---|
| `STEWARD_APPROVED_FOR_PROTOTYPE` | Approved by the Project Steward for design, development, internal preview, and owner presentation. **Does not** authorize publication as a factual business commitment. |
| `OWNER_VERIFICATION_REQUIRED` | Requires confirmation from the actual TEN29 owner or authorized business manager. |
| `EVIDENCE_REQUIRED` | Requires a record, photograph, permit, account detail, or other supporting evidence. |
| `APPROVED_FOR_PUBLICATION` | May only be applied after the necessary owner verification and evidence have been recorded — matches the same status name already used in `src/content/claims.ts`. |

These are additive to the existing `claims.ts` status vocabulary ([[05_OWNER_APPROVAL_MATRIX]]), not a replacement for it. Every claim in this document currently remains `PROPOSED_PENDING_APPROVAL` or `UNVERIFIED` in the code; nothing here changes what the public site renders.

## 2. Project Steward decisions

All values below were approved by the Project Steward on 2026-07-28 through three question batches. Every row is `STEWARD_APPROVED_FOR_PROTOTYPE` — none is `APPROVED_FOR_PUBLICATION`. Owner confirmation is required before any of these can move to `APPROVED_FOR_PUBLICATION` in `claims.ts`.

| Decision ID | Category | Original proposed value | Steward decision | Final steward-approved value | Rationale | Affected routes | Prototype status | Owner confirmation still needed | Notes |
|---|---|---|---|---|---|---|---|---|---|
| CLM-POS-001 | Brand positioning | "modern private whole-home stay ... for small families and groups seeking a comfortable place to rest, reconnect, and spend time together" | Approve as drafted | Same as proposed | Matches [[13_CONTENT_AND_CLAIM_STANDARD]] voice (calm, not exaggerated) | Homepage, owner preview | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Audience phrase superseded — see CLM-POS-001b |
| CLM-POS-002 | Tagline | "Comfortable stays. Memorable moments. A place that feels like home." | Approve as drafted | Same as proposed | No prohibited-copy terms; consistent tone | Owner preview (fallback hero used publicly today) | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Not yet rendered publicly |
| CLM-POS-004 | Homepage headline | "Your private place to rest, reconnect, and feel at home." | Approve as drafted | Same as proposed | Consistent with positioning statement | Homepage hero | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Public fallback ("Discover TEN29...") remains live until published |
| CLM-POS-005 | Homepage supporting copy | "A modern holiday-home stay in Biclatan, General Trias for small families and groups." | Approve as drafted | Same as proposed | Consistent with positioning statement | Homepage hero | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Audience phrase superseded — see CLM-POS-001b |
| CLM-POS-001b | Target audience emphasis | "small families and groups" (embedded in POS-001, POS-005) | Broaden | "small families, groups of friends (barkada), and similar small groups" | Widens reach beyond family travelers without implying the property accepts strangers-only bookings or large events; stays consistent with the 6/8/10-guest capacity model | Homepage, positioning copy | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Reconciliation task: update the `value` strings in `claims.ts` CLM-POS-001 and CLM-POS-005 to this phrasing when claims are next edited — not done in this task |
| CLM-POS-003 | General Trias-first location positioning & Tagaytay-access wording | "Located in Biclatan, General Trias, with road access toward Amadeo and Tagaytay." | Approve as drafted | Same as proposed | Matches the mandatory content-standard distinction: General Trias is the location, Tagaytay is only ever "road access toward" | Homepage, /location | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Already code-enforced as a banned-phrase test per [[20_RISK_REGISTER]] |
| SD-MODEL-01 | Enquiry-not-booking operating model | Implemented behavior: no automated confirmation anywhere; every enquiry touchpoint states manual confirmation | Approve as the steward-approved operating model | Same as implemented | Prevents the site from being perceived as a live booking system ([[20_RISK_REGISTER]] top mitigated risk) | Homepage, /book, /availability, /contact | STEWARD_APPROVED_FOR_PROTOTYPE | No — this is a process decision, not a factual claim; owner should still be told it's the model in the final confirmation (section 8) | No corresponding `claims.ts` entry; it's behavior, not a claim string |
| SD-FALLBACK-01 | Public fallback content approach | Fallback copy table in [[13_CONTENT_AND_CLAIM_STANDARD]] (e.g. "Rates are currently being finalized...") | Approve as-is | Same as documented | Keeps the public site honest while values are pending, per the public-claim gate | All public routes | STEWARD_APPROVED_FOR_PROTOTYPE | No — this is a content-safety mechanism, not a factual claim | Enforced in code (`src/content/fallback-copy.ts`, `isPublicClaim`) |
| SD-CHANNEL-01 | Website/Facebook channel relationship | Website adds a structured enquiry channel; Facebook Messenger stays live in parallel | Approve as steward-approved | Same as proposed | Avoids disrupting an existing guest channel while the site is new/unverified | Homepage, /contact, [[06_DIGITAL_PRESENCE_REPAIR]] | STEWARD_APPROVED_FOR_PROTOTYPE | No | Matches [[23_OWNER_HANDOVER]]: "does not replace Messenger" |
| CLM-CAP-001 | Base overnight capacity | 6 guests | Approve as-is | 6 guests | Internally consistent with rate card ("up to 6 guests") | /rates, /property, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Part of one consolidated capacity approval (DEC-05) |
| CLM-CAP-002 | Maximum overnight capacity | 8 guests | Approve as-is | 8 guests | 6 base + 2 paid extra guests (CLM-RATE-006) | /rates, /property, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-CAP-003 | Maximum total persons on property | 10 (day visitors included) | Approve as-is | 10 | Distinguishes overnight vs. total-on-property for safety/parking planning | /property, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Actual safe occupancy still owner/evidence-gated — see section 4 |
| CLM-CAP-004 | Indoor parking capacity | 1 vehicle | Approve as-is | 1 vehicle | Matches typical subdivision unit allocation pending confirmation | /property, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Actual parking capacity is a separate owner-verification item (section 4) |
| CLM-CAP-005 | Minimum lead-guest age | 21 | Approve as-is | 21 | Standard short-term-rental practice | /book, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-CAP-006 | Minimum stay | 1 night | Approve as-is | 1 night | No operational reason found to restrict further at prototype stage | /book, /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-001 | Sun–Thu rate | PHP 4,499 up to 6 guests | Approve as-is | Same | Coherent weekday/weekend/holiday tier structure | /rates, homepage | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Part of one consolidated rate-card approval (DEC-06) |
| CLM-RATE-002 | Friday rate | PHP 4,999 up to 6 guests | Approve as-is | Same | — | /rates, homepage | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-003 | Saturday rate | PHP 5,999 up to 6 guests | Approve as-is | Same | — | /rates, homepage | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-004 | Declared public holiday rate | PHP 6,499 up to 6 guests | Approve as-is | Same | — | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-005 | Peak holiday period rate | From PHP 6,999 up to 6 guests | Approve as-is | Same | — | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-006 | Additional overnight guest fee | PHP 500 each, max 2 | Approve as-is | Same | Matches CLM-CAP-002 (8-guest max = 6 base + 2 extra) | /rates, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RATE-007 | Refundable security deposit | PHP 2,000 | Approve as-is | Same | Standard practice; refundable, not a charge | /rates, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Also governs deposit/balance rules (DEC-09) |
| CLM-RATE-008 | Early check-in / late check-out fee | PHP 500 per approved hour | Approve as-is | Same | Ties to CLM-HOURS-002/003 | /rates, /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-PROMO-001 | Two consecutive nights | PHP 500 off total | Approve as-is | Same | Encourages longer stays | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Full promo package approved together (DEC-07) |
| CLM-PROMO-002 | Three or more nights | 10% off accommodation | Approve as-is | Same | — | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-PROMO-003 | Launch rate (optional) | PHP 3,999 weekday, first 10 completed bookings | Approve as-is | Same | Already marked optional in the register; kept to help initial traction | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Owner may decline at final confirmation without blocking the rest |
| CLM-PROMO-004 | Returning verified guest | 5% off | Approve as-is | Same | Simple loyalty incentive | /rates | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-HOURS-001 | Booking-enquiry support hours | 8:00 AM–9:00 PM daily | Approve as-is | Same | Replaces the inaccurate "Always open" Facebook listing | /contact, homepage, [[06_DIGITAL_PRESENCE_REPAIR]] | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Full hours package approved together (DEC-08) |
| CLM-HOURS-002 | Check-in time | 2:00 PM | Approve as-is | Same | Standard short-term-rental turnover window | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-HOURS-003 | Check-out time | 11:00 AM | Approve as-is | Same | — | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-HOURS-004 | Quiet hours | 10:00 PM–7:00 AM | Approve as-is | Same | Neighbor/subdivision consideration | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-PAY-001 | Deposit and balance rules (>3 days before arrival) | 50% deposit; balance due 3 days before check-in | Approve as-is | Same | Standard split; protects both sides | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Full payment package approved together (DEC-09) |
| CLM-PAY-002 | Deposit and balance rules (≤3 days / same-day) | Full payment required before confirmation | Approve as-is | Same | Reduces late-cancellation exposure on short notice | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-PAY-003 | Proposed payment channels | GCash, bank transfer | Approve as-is | Same | Common Philippine short-term-rental channels | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Account name/number never enter source control (unchanged rule) |
| CLM-CXL-001 | Cancellation ≥14 days | 90% refund or free reschedule | Approve as-is | Same | Guest-favorable at long lead times | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Full cancellation package approved together (DEC-10) |
| CLM-CXL-002 | Cancellation 7–13 days | 50% refund or free reschedule | Approve as-is | Same | — | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-CXL-003 | Cancellation <7 days | Non-refundable | Approve as-is | Same | Protects near-term revenue against late drop-outs | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-CXL-003b | No-show treatment | Non-refundable (same value as CLM-CXL-003) | Approve as-is | Same | No-show is treated identically to a <7-day cancellation | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Same underlying claim as CLM-CXL-003; listed separately because it was a distinct required decision category |
| CLM-RULE-001 (smoking) | House rule — smoking | Indoor smoking and vaping prohibited | Approve as-is | Same | Property protection, guest health | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Full house-rules package approved together (DEC-11) |
| CLM-RULE-001 (pets) | House rule — pets | No pets during initial operations | Approve as-is | Same | Conservative default until cleaning/allergy handling is established | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Revisitable operating policy, not a factual claim about the property |
| CLM-RULE-001 (parties/events) | House rule — parties and events | Parties, commercial shoots, ticketed events, and large celebrations require a separate written agreement | Approve as-is | Same | Protects the property and neighbors from unplanned large gatherings | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RULE-001 (CCTV wording) | House rule — CCTV wording | Exterior CCTV may cover entrances and parking only; no cameras in bedrooms/bathrooms/private indoor areas | Approve as-is | Same | Standard guest-privacy assurance wording | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | Wording only — actual CCTV locations are an owner-verification item (section 4) |
| CLM-RULE-001 (ID requirement) | House rule — identification | Lead guest may be required to provide one valid government-issued ID at the appropriate booking stage | Approve as-is | Same | Standard short-term-rental practice; "may be required" keeps it flexible | /policies, /book | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |
| CLM-RULE-001 (damage/cleaning) | House rule — damage and cleaning | Damage and excessive cleaning deductions require evidence and explanation | Approve as-is | Same | Protects guests from undocumented deposit deductions | /policies | STEWARD_APPROVED_FOR_PROTOTYPE | Yes | — |

## 3. Decisions that do not need owner redesign

The actual TEN29 owner is not being asked to design the website or business system from zero. The Project Steward has already prepared, and this document steward-approves for prototype: positioning, page structure, the booking-enquiry process, a proposed rate model, proposed policies, proposed guest rules, a proposed payment process, digital-profile corrections ([[06_DIGITAL_PRESENCE_REPAIR]]), and the upgrade path (Option 1 → 2 → 3, per [[00_PROJECT_CHARTER]]). The owner's role from here is narrower: **confirm, revise, or reject** the resulting business commitments in section 8, and supply the facts and assets only the owner can supply (sections 4–6).

## 4. Actual owner verification gate

| Item | Current state | Proposed/expected value | Evidence or confirmation required | Affected pages | Blocks production launch | May remain unpublished without blocking launch |
|---|---|---|---|---|---|---|
| Bedroom count | UNVERIFIED (CLM-FACT-001, blank) | None yet | Owner count | /property | Yes | No |
| Bed types and quantities | UNVERIFIED (CLM-FACT-002) | None | Owner count/description | /property | Yes | No |
| Bathroom count | UNVERIFIED (CLM-FACT-003) | None | Owner count | /property | Yes | No |
| Actual safe occupancy | UNVERIFIED (CLM-FACT-004) | Steward-proposed 6/8/10 model (section 2) is a planning target, not a verified limit | Owner confirmation the property can safely hold these numbers | /property, /policies, /rates | Yes | No |
| Actual parking capacity | UNVERIFIED (CLM-FACT-005) | Steward-proposed 1 vehicle indoor | Owner confirmation + subdivision rules | /property | Yes | No |
| Wi-Fi (working amenity) | UNVERIFIED (CLM-FACT-006) | None | Owner confirmation it works | /property | No | Yes |
| Air-conditioning (working amenity) | UNVERIFIED (CLM-FACT-007) | None | Owner confirmation, room coverage | /property | No | Yes |
| Kitchen equipment | UNVERIFIED (CLM-FACT-008) | None | Owner inventory | /property | No | Yes |
| Television/entertainment | UNVERIFIED (CLM-FACT-009) | None | Owner confirmation | /property | No | Yes |
| Towels and toiletries | UNVERIFIED (CLM-FACT-013) | None | Owner confirmation of what's provided | /property, /policies | No | Yes |
| Pool or subdivision amenity access | UNVERIFIED (CLM-FACT-010) | None | Owner confirmation + subdivision rules | /property | No | Yes |
| CCTV locations | UNVERIFIED (CLM-FACT-015) | Steward-approved wording only ("entrances and parking, no indoor cameras" — section 2) | Owner confirmation of actual camera placement matches that wording | /policies | Yes (wording must match reality before publication) | No |
| Fire extinguisher | UNVERIFIED (CLM-FACT-016) | None | Owner confirmation/photo | /property, /policies | Yes | No |
| Smoke detectors | UNVERIFIED (CLM-FACT-017) | None | Owner confirmation/photo | /property, /policies | Yes | No |
| First-aid kit | UNVERIFIED (CLM-FACT-018) | None | Owner confirmation/photo | /property, /policies | Yes | No |
| Emergency exits | UNVERIFIED (CLM-FACT-019) | None | Owner confirmation/photo | /property, /policies | Yes | No |
| Backup water/electricity | UNVERIFIED (CLM-FACT-020) | None | Owner confirmation | /property | No | Yes |
| Property owner or authorized operator | UNVERIFIED (CLM-FACT-027) | None | Identity confirmation | Internal / legal only | Yes | No |
| Business registration | UNVERIFIED (CLM-FACT-021 relates) | None | Business permit record | Internal / legal only | Yes | No |
| General Trias permit | UNVERIFIED (CLM-FACT-021) | None | Permit document | Internal / legal only | Yes | No |
| Barangay clearance | UNVERIFIED (CLM-FACT-022) | None | Clearance document | Internal / legal only | Yes | No |
| BIR status | UNVERIFIED (CLM-FACT-023) | None | Registration record | Internal / legal only | Yes | No |
| HOA/subdivision short-stay permission | UNVERIFIED (CLM-FACT-025) | None | HOA confirmation/document | Internal / legal only | Yes | No |
| Tourism registration/accreditation | UNVERIFIED (CLM-FACT-026) | None | Registration record, if applicable | Internal / legal only | No (not universally required) | Yes |
| Official payment-account holder | UNVERIFIED (CLM-FACT-028) | Steward-proposed channels: GCash, bank transfer (CLM-PAY-003) | Confirmed account holder name matches business identity | Not published (never in source control) | Yes | No |
| Image ownership and usage rights | UNVERIFIED (CLM-FACT-029) | None | Written permission per [[24_ASSET_REQUIREMENTS]] | Gallery, property, homepage | Yes | No |
| Final rates the business will honor | Steward-proposed (section 2, CLM-RATE-001..008) | See section 2 | Owner accept, reject, or amend | /rates, homepage | Yes | No |
| Final cancellation and refund commitments | Steward-proposed (section 2, CLM-CXL-001..003) | See section 2 | Owner accept, reject, or amend | /policies | Yes | No |
| Final production-launch authorization | Not granted | N/A | Explicit owner sign-off | Whole site | Yes | No |

## 5. Production asset gate

Per [[24_ASSET_REQUIREMENTS]], naming convention `ten29-[area]-[number].jpg`, stored under `public/images/ten29/` (originals kept outside the repository).

| Asset | Format/dimensions | Website use | Who supplies |
|---|---|---|---|
| Official logo | SVG preferred, or transparent PNG ≥1000px wide | Header, footer, favicon source | Owner |
| Exterior photographs | JPEG/WebP, landscape ≥1920×1280 | Homepage, gallery, property | Owner |
| Entrance and parking | Same | Property, gallery | Owner |
| Living room | Same | Property, gallery, homepage | Owner |
| Kitchen and dining | Same | Property, gallery | Owner |
| Every bedroom | Same, one set per distinct bedroom | Property, gallery | Owner |
| Every bed arrangement | Same | Property | Owner |
| Every bathroom | Same, one set per distinct bathroom | Property, gallery | Owner |
| Actual amenities (only those confirmed working) | Same | Property | Owner |
| Safety equipment (extinguisher, smoke detector, first-aid kit, marked exits) | Same | Property, policies | Owner |
| Optional property video | MP4, ≤60s, no unlicensed music | Property (optional) | Owner |
| Social-sharing image | Sized per Open Graph convention (not yet built) | Meta tags | Owner (source photo) + developer (crop/encode) |
| Favicon | Derived from logo | Browser tab | Developer, from owner logo |
| Photo-use authorization | Short written confirmation (email sufficient) | Not published; internal record | Owner |
| Final Facebook URL | — | Header, footer, contact | Owner |
| Final Instagram URL | — | Footer, contact | Owner |
| Final Google Maps URL | — | Location, contact | Owner |
| Official business email | — | Contact, footer | Owner |
| Privacy contact | — | Privacy policy | Owner |

## 6. External profile correction gate

No changes are performed as part of this task — checklists only, per [[06_DIGITAL_PRESENCE_REPAIR]].

### Facebook

| Item | Present issue | Proposed correction | Owner account access required | Evidence of completion | Priority |
|---|---|---|---|---|---|
| Accommodation category | Miscategorized (food-business metadata present) | Vacation Home Rental or closest valid category | Yes | Screenshot of updated category | Pre-launch |
| Dine-in | Shown | Remove | Yes | Screenshot | Pre-launch |
| Curbside pickup | Shown | Remove | Yes | Screenshot | Pre-launch |
| Food specialties | Shown | Remove | Yes | Screenshot | Pre-launch |
| Pound-sign price indicator | Shown | Remove | Yes | Screenshot | Pre-launch |
| "Always Open" | Shown | Replace with approved enquiry hours (CLM-HOURS-001, steward-approved) unless genuine 24-hour support exists | Yes | Screenshot | Pre-launch |
| Enquiry hours | Not set | Add 8:00 AM–9:00 PM daily (steward-approved) | Yes | Screenshot | Pre-launch |
| Website and business email | Not present | Add after launch | Yes | Screenshot | Post-launch |
| Page Transparency | Not reviewed | Review page creation date, name history, admin countries | Yes | Written summary | Pre-launch |

### Instagram

| Item | Present issue | Proposed correction | Owner account access required | Evidence of completion | Priority |
|---|---|---|---|---|---|
| Accommodation category | Miscategorized | Vacation Home Rental or closest accommodation category | Yes | Screenshot | Pre-launch |
| "Chicken Joint" metadata | Present where controllable | Remove or correct | Yes | Screenshot | Pre-launch |
| Food-service information | Present | Remove | Yes | Screenshot | Pre-launch |
| Facebook Page connection | Not confirmed | Connect the official Facebook Page | Yes | Screenshot | Pre-launch |
| Phone, location, website | Not standardized | Match Facebook exactly | Yes | Screenshot | Pre-launch |

### Google Business Profile

| Item | Present issue | Proposed correction | Owner account access required | Evidence of completion | Priority |
|---|---|---|---|---|---|
| Business name capitalization | Inconsistent | Standardize to "TEN29 Holiday Homes" | Yes | Screenshot | Pre-launch |
| Category | Listed as "Hotel" | Review "Vacation Home Rental" as more accurate | Yes | Screenshot | Pre-launch |
| Photos | Unknown/legacy | Use approved original photographs only | Yes | Screenshot | Pre-launch |
| Amenities | Unknown/legacy | Publish only verified amenities | Yes | Screenshot | Pre-launch |
| Hours | Unknown/legacy | Use approved hours (CLM-HOURS-001) | Yes | Screenshot | Pre-launch |
| Website | Not present | Add official website | Yes | Screenshot | Post-launch |
| Location positioning | Unknown/legacy | Preserve accurate General Trias positioning | Yes | Screenshot | Pre-launch |
| Reviews | Zero | Collect only genuine post-stay reviews | Yes | N/A — ongoing | Post-launch |

## 7. Publication rules

- Steward approval allows implementation and preview. It does not turn an unverified business fact into a public claim.
- Real property facts (section 4) remain hidden — shown via fallback copy per [[13_CONTENT_AND_CLAIM_STANDARD]] — until owner-verified.
- Proposed rates and policies (section 2) may appear only in the authenticated `/admin/owner-preview` unless the actual owner confirms them for publication.
- No payment-account details may be stored in source control, at any approval status.
- No production launch may occur without the owner's final authorization (section 8, item 8).

## 8. Minimal final confirmation for the TEN29 owner

1. Are the property facts accurate?
2. Are the published rates and charges accepted?
3. Are the payment and refund rules accepted?
4. Are the house rules accepted?
5. Are the photographs owned or authorized?
6. Are the official account and contact details correct?
7. Is the business authorized to operate and accept bookings?
8. Is the website authorized for production launch?

## 9. Next controlled action

After this document is reviewed:

- Reconcile the section 2 Project Steward decisions into the proposed claim records in `src/content/claims.ts` and [[05_OWNER_APPROVAL_MATRIX]] (including the CLM-POS-001b audience-wording change).
- Retain the public claim gate (`isPublicClaim`) unchanged.
- Prepare an authenticated owner preview reflecting these steward-approved values.
- Gather only the factual confirmations and assets listed in sections 4–6 from the real owner.
- Handle production-service setup and live acceptance testing in later, separately bounded tasks — not part of this task.
