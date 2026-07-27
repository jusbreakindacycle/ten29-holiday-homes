# 07 — Information Architecture

## Public routes

| Route | Purpose |
|---|---|
| `/` | Homepage — brand intro, highlights, gallery preview, process, rates preview, location, FAQ preview, CTAs |
| `/property` | Full property presentation and approved/fallback highlights |
| `/gallery` | Image gallery with descriptive alt text |
| `/rates` | Rates with approval-state rendering |
| `/availability` | Availability-request explanation (not a live calendar) |
| `/policies` | House rules, cancellation, payment policy framework |
| `/location` | Map, directions, General Trias-first wording |
| `/faq` | Frequently asked questions |
| `/book` | Booking-enquiry form |
| `/contact` | Contact channels: Messenger, phone, map, form |
| `/privacy` | Privacy notice |
| `/terms` | Terms of use |

## Admin routes (all protected, all excluded from navigation/sitemap/robots)

| Route | Purpose |
|---|---|
| `/admin/login` | Owner/staff sign-in |
| `/admin` | Dashboard counts and quick links |
| `/admin/inquiries` | Filterable inquiry list, CSV export |
| `/admin/inquiries/[id]` | Inquiry detail, status, notes |
| `/admin/owner-preview` | Read-only review of proposed/pending claims |
| `/admin/claims` | Claim registry viewer |

## Navigation structure

Primary header navigation (public): Home, Property, Gallery, Rates, Location, FAQ, Contact, plus a persistent "Request Your Dates" CTA linking to `/book`.

Footer: quick links (all public routes), contact block (phone, Messenger, map), privacy/terms links, truthful business info block sourced from the claim registry, and a note that the site is an enquiry channel, not an instant-booking system.

Admin routes are reachable only via direct URL and authenticated session — never linked from public navigation, sitemap.xml, or indexed by robots.txt.
