# 11 — Functional Requirements

IDs: `FR-PUB-*` (public), `FR-INQ-*` (enquiry), `FR-ADM-*` (admin).

## Public

| ID | Requirement | Status |
|---|---|---|
| FR-PUB-001 | Responsive navigation across mobile/tablet/desktop | Implemented |
| FR-PUB-002 | Accessible mobile menu (keyboard + screen-reader operable) | Implemented |
| FR-PUB-003 | Brand introduction reflecting approved/fallback positioning | Implemented |
| FR-PUB-004 | Approved-claim rendering only; proposed claims never shown publicly | Implemented |
| FR-PUB-005 | Gallery with descriptive alt text and placeholder framework | Implemented |
| FR-PUB-006 | Rates page with approval-state rendering + fallback copy | Implemented |
| FR-PUB-007 | Policies page with approval-state rendering + fallback copy | Implemented |
| FR-PUB-008 | Location page, General Trias-first wording | Implemented |
| FR-PUB-009 | FAQ page | Implemented |
| FR-PUB-010 | Contact actions: Messenger, phone, map | Implemented |
| FR-PUB-011 | Messenger link (configurable via env/content) | Implemented |
| FR-PUB-012 | Telephone link (`tel:+639615868106`) | Implemented |
| FR-PUB-013 | Google Maps link via configurable env/content value | Implemented |
| FR-PUB-014 | Enquiry form | Implemented |
| FR-PUB-015 | Enquiry success state with non-confirmation language | Implemented |
| FR-PUB-016 | Privacy consent checkbox, required | Implemented |
| FR-PUB-017 | Unique SEO metadata per route | Implemented |
| FR-PUB-018 | `sitemap.xml` (public routes only) | Implemented |
| FR-PUB-019 | `robots.txt` (disallows `/admin`) | Implemented |
| FR-PUB-020 | Custom 404 page | Implemented |
| FR-PUB-021 | Error boundary | Implemented |
| FR-PUB-022 | Loading states for async routes | Implemented |

## Enquiry

| ID | Requirement | Status |
|---|---|---|
| FR-INQ-001 | Server-side validation (Zod) of every field | Implemented |
| FR-INQ-002 | Check-out date must be after check-in date | Implemented |
| FR-INQ-003 | Sensible maximum date range (18 months out) | Implemented |
| FR-INQ-004 | Guest-count validation (adults ≥ 1, non-negative counts, sane maxima) | Implemented |
| FR-INQ-005 | Required name and mobile number | Implemented |
| FR-INQ-006 | Optional email, validated when present | Implemented |
| FR-INQ-007 | Required privacy consent | Implemented |
| FR-INQ-008 | Honeypot spam field | Implemented |
| FR-INQ-009 | Submission-timing check (reject sub-second bot fills) as lightweight anti-bot defense | Implemented |
| FR-INQ-010 | Unique human-readable reference code | Implemented |
| FR-INQ-011 | Persist-before-notify rule | Implemented |
| FR-INQ-012 | Owner notification email | Implemented |
| FR-INQ-013 | Guest acknowledgement email when email supplied | Implemented |
| FR-INQ-014 | Source + UTM capture | Implemented |
| FR-INQ-015 | Duplicate rapid-submit protection (client debounce + server dedup window) | Implemented |
| FR-INQ-016 | Friendly failure handling with retry guidance | Implemented |
| FR-INQ-017 | No booking-confirmation language anywhere in the flow | Implemented |

## Admin

| ID | Requirement | Status |
|---|---|---|
| FR-ADM-001 | Secure login via Supabase Auth | Implemented |
| FR-ADM-002 | Protected routes (server-side session check) | Implemented |
| FR-ADM-003 | Dashboard counts by status + notification failures | Implemented |
| FR-ADM-004 | Inquiry list | Implemented |
| FR-ADM-005 | Search and filters (status, check-in date, source, text) | Implemented |
| FR-ADM-006 | Inquiry detail view | Implemented |
| FR-ADM-007 | Status updates (validated transitions) | Implemented |
| FR-ADM-008 | Owner notes | Implemented |
| FR-ADM-009 | Notification state visibility (sent/failed/error) | Implemented |
| FR-ADM-010 | CSV export | Implemented |
| FR-ADM-011 | Owner-preview page (read-only claim review) | Implemented |
| FR-ADM-012 | Claim registry view | Implemented |
| FR-ADM-013 | Sign out | Implemented |

No public self-registration exists for admin users (FR-ADM-001 depends on accounts provisioned directly in Supabase Auth by the developer/owner — see [[23_OWNER_HANDOVER]]).
