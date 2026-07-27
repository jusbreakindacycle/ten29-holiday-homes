# TEN29 HOLIDAY HOMES — CLAUDE CODE MASTER BLUEPRINT AND OPTION 1 BUILD PROMPT

You are acting as the principal product strategist, Philippine hospitality-operations analyst, project manager, business analyst, UX architect, content strategist, senior full-stack engineer, database architect, privacy and security reviewer, SEO specialist, QA lead, DevOps engineer, and technical writer for a real client project.

You are operating inside the currently opened VS Code workspace folder:

`ten29-holiday-homes`

The folder is intentionally empty. Build inside this exact root. Do not create another nested `ten29-holiday-homes` directory.

This is a real freelance project, not a school mock-up, not a generic template, not a speculative Airbnb clone, and not an excuse to generate superficial project-charter language.

Your mission is to create the complete project operating system, master blueprint, upgrade-ready architecture, and working Option 1 website for TEN29 Holiday Homes.

---

# 1. EXECUTION BEHAVIOR

Follow these rules throughout the task.

1. Inspect the current directory first and confirm what exists.
2. If the folder is empty, initialize the application in the current root.
3. Use `npm` because the development environment is Windows and the owner/developer needs a familiar setup.
4. Use the current stable releases of the chosen libraries. Do not guess or hard-code obsolete versions.
5. Use official documentation when a current framework or provider behavior matters.
6. Create a root-level `CLAUDE.md` containing the permanent project rules and business context so future Claude Code sessions remain consistent.
7. Initialize Git if the folder is not already a repository.
8. Do not create commits unless explicitly requested.
9. Never place passwords, API keys, database secrets, service-role keys, personal IDs, payment screenshots, or real guest data in the repository.
10. Create `.env.example`, but never create a committed `.env.local` containing secrets.
11. Do not purchase a domain, create paid cloud accounts, deploy to production, change Facebook/Instagram/Google profiles, or perform irreversible external actions.
12. Do not ask broad or generic discovery questions before starting.
13. Proceed using the verified facts and proposed settings in this prompt.
14. When a business statement is not verified, classify it correctly and keep it out of public production content until approved.
15. Do not invent bedrooms, beds, bathrooms, amenities, permits, reviews, ratings, travel times, availability, prices, payment-account details, or ownership claims.
16. Do not use random tourism stock photos or copied images of Sky Ranch, Picnic Grove, Tagaytay attractions, competing properties, or other copyrighted businesses.
17. If final owner assets are unavailable, create elegant neutral placeholders and a precise asset-requirements checklist. Do not fabricate property imagery.
18. Do not stop after writing documentation. After the documentation foundation is created, implement the working Option 1 application.
19. At the end of every major phase, run the relevant checks and update the execution log.
20. At completion, provide a concise report of files created, architecture decisions, tests run, unresolved approval gates, and exact local run instructions.

Only pause when credentials, paid services, an irreversible external action, or a genuinely blocking technical error requires human intervention.

---

# 2. VERIFIED PROJECT IDENTITY

Use these facts as the current controlling project context.

## Business

- Public brand: `TEN29 Holiday Homes`
- Business type currently presented online: holiday-home rental / accommodation
- Public phone display: `0961 586 8106`
- Telephone link format: `+639615868106`
- Property location shown on Google Maps:
  - Holiday Homes subdivision
  - Barangay Biclatan
  - General Trias, Cavite 4107
- More precise map record:
  - Block 10, Lot 29
  - Do not automatically publish the complete block-and-lot address on every public page.
- Proposed official domain:
  - `ten29holidayhomes.com`
  - Expected canonical production URL: `https://www.ten29holidayhomes.com`
  - Domain availability remains unconfirmed until registrar checkout.
- Proposed business email:
  - `bookings@ten29holidayhomes.com`
  - This is not active until the owner creates the mailbox.

## Current online presence

As of the project discovery snapshot dated 2026-07-27:

- Facebook Page exists under the TEN29 Holiday Homes name.
- Facebook Page shows approximately 1.7K followers, 8 following, and 32 posts.
- Facebook Page shows zero reviews.
- Google Maps listing exists and currently categorizes the property as a hotel.
- Current booking calls to action direct customers to Messenger or telephone.
- No current maintainable standalone website source code is available.
- The owner reported having had a website connected with an earlier Dubai arrangement, but it was not renewed and the original IT person is no longer available.
- Treat the old website as unavailable legacy history, not as a codebase to recover or copy.
- No verified exact-name public listing has been found on Airbnb, Agoda, Booking.com, Traveloka, Expedia, or Trip.com.
- Do not make an absolute claim that no differently named or unpublished listing could exist.

## Current digital inconsistencies

The current public profiles have displayed legacy or incorrect metadata, including:

- `Dine-in`
- `Curbside pickup`
- a pound-sign price indicator
- food-related specialties
- an Instagram/location classification associated with `Chicken Joint`
- `Always open`
- Google Maps category `Hotel`

These profile corrections are part of the broader digital-launch workstream, but the repository cannot directly change external platform accounts. Create a documented repair checklist.

---

# 3. CLAIM CLASSIFICATION SYSTEM

All business content must use one of these states:

1. `VERIFIED`
   - Confirmed by a supplied primary business record, live official profile, owner-provided original asset, or direct owner approval with a date.

2. `OWNER_REPORTED`
   - Stated by the owner or authorized manager but not independently documented.

3. `PROPOSED_PENDING_APPROVAL`
   - Developed by this project as a recommended operating value or public statement, but not yet approved.

4. `UNVERIFIED`
   - Mentioned, inferred, or observed but insufficiently supported for publication.

5. `APPROVED_FOR_PUBLICATION`
   - Explicitly approved by the owner for website publication, with approver and date recorded.

6. `REJECTED_OR_SUPERSEDED`
   - Considered but rejected, replaced, or no longer valid.

Create a claim register that records:

- claim ID
- field/category
- proposed or factual value
- status
- source/evidence
- owner approver
- approval date
- where the claim is allowed to appear
- notes
- superseded claim reference, where applicable

## Public-claim gate

The public application must never render a `PROPOSED_PENDING_APPROVAL` or `UNVERIFIED` claim as established fact.

Implement this rule in code, not merely in documentation.

Recommended approach:

- Create a typed content/claim registry.
- Allow `VERIFIED` and `APPROVED_FOR_PUBLICATION` claims to render publicly.
- Hide proposed values by default.
- Provide an owner-preview or development-only view where proposed values can be reviewed.
- Add automated tests proving that unapproved claims do not appear in public production pages.

---

# 4. NON-GENERIC PROJECT CHARTER

Create `docs/00_PROJECT_CHARTER.md` using the following substance.

## Project name

`TEN29 Holiday Homes Digital Launch and Upgrade-Ready Booking Foundation`

## Problem statement

TEN29 has an identifiable physical property, a Facebook audience, a Messenger-based enquiry channel, a Google Maps listing, and active promotional content, but it does not currently have a maintainable official website or a controlled digital source of truth. Public information is fragmented across Facebook, Google Maps, Messenger, and legacy Meta location data. Some profile fields still describe restaurant services, while rates, availability, capacity, amenities, policies, payment procedures, and review evidence are incomplete or unpublished. The result is avoidable customer uncertainty, repetitive manual enquiries, inconsistent public claims, and no reliable technical foundation for future calendar, payment, and AI automation.

## Project purpose

Create TEN29's official, owner-controlled, mobile-first website and structured booking-enquiry foundation under the proposed domain `ten29holidayhomes.com`, while ensuring that only verified or owner-approved business claims are published.

## Option 1 objective

Deliver a professional digital-launch website that:

- explains what TEN29 is and where it is actually located;
- presents approved property content, rates, policies, and FAQs;
- captures structured booking enquiries;
- sends reliable owner notifications;
- provides a basic protected enquiry dashboard;
- directs guests to Messenger, telephone, Google Maps, and the website enquiry flow;
- preserves manual availability confirmation and manual GCash/bank-transfer payment handling;
- creates an architecture that can be upgraded to a master booking calendar, payment tracking, online payment gateway, and AI Messenger system without replacing the original website.

## Primary stakeholders

- TEN29 owner
- Authorized TEN29 booking manager
- Prospective guests
- Future TEN29 staff
- Project developer and maintainer
- Future payment, email, hosting, and messaging providers

## Decision authority

- The owner approves public claims, rates, capacity, amenities, payment instructions, policies, and production launch.
- The developer controls implementation quality, code organization, security safeguards, and technical recommendations.
- No unapproved claim becomes public merely because it exists in a proposal or seed file.

## Option 1 in scope

- Public mobile-responsive website
- Property and brand presentation
- Gallery framework
- Rates page with approval-gated content
- Availability-request page, not a live availability calendar
- Policies and house-rules framework
- FAQ
- Location page
- Contact page
- Booking-enquiry form
- Email notifications
- Guest acknowledgement email when an email address is supplied
- Basic protected enquiry dashboard
- Inquiry statuses and notes
- Messenger, telephone, and Google Maps calls to action
- Privacy notice and terms
- Basic SEO and search-engine setup files
- Production-readiness documentation
- Upgrade-ready architecture

## Explicit Option 1 exclusions

- Instant booking
- A live master availability calendar
- Automated date holds
- Automated double-booking prevention
- Payment-proof upload
- Payment reconciliation
- Guest balance ledger
- Security-deposit ledger
- Online payment gateway
- PayMongo integration
- Automated payment confirmation
- Meta Messenger API integration
- AI Messenger assistant
- Automated Messenger lead scoring
- OTA calendar synchronization
- Airbnb, Agoda, or Booking.com integration
- Dynamic pricing
- Public guest-review system
- Multi-property management
- Mobile application
- Full property-management system

## Constraints

- The property is still in a launch or soft-launch stage.
- Final original logo and complete property image set may not yet be available.
- Several public claims remain pending approval.
- Production third-party accounts must be created under TEN29 or the owner's official email.
- The project begins in an empty local Windows workspace.
- Commercial Vercel deployment requires the appropriate paid account.
- Option 1 may use low-cost/free service tiers where safe, but must document production limitations.

## Success criteria

Technical and operational success means:

- The website builds and runs without errors.
- Mobile navigation and core forms work.
- Every valid website enquiry is persisted before email delivery is attempted.
- Email failure does not destroy the stored enquiry.
- Unapproved claims are absent from public pages.
- The owner can sign in and review website enquiries.
- Public pages clearly distinguish enquiry from confirmed booking.
- No page implies that a submitted form reserves a date.
- No page marks a payment as accepted or verified.
- The site has accessible labels, keyboard navigation, semantic structure, and useful validation messages.
- Core pages have correct metadata, canonical URL handling, sitemap, and robots configuration.
- Tests cover the public-claim gate and enquiry workflow.
- Documentation explains how to upgrade without replacing the Option 1 site.

Do not replace this charter with generic statements such as "improve user experience" without TEN29-specific context.

---

# 5. EXACT VISION, MISSION, AND PRODUCT PRINCIPLES

Create separate documents.

## `docs/01_VISION.md`

Use this controlling vision:

> Make TEN29 Holiday Homes the most trusted and easiest-to-understand direct digital entry point for a holiday-home stay in Biclatan, General Trias, while preserving owner control and growing safely from manual enquiries into a unified booking, payment, and AI-assisted operation.

Explain that trust means:

- correct location;
- authentic owner-approved photos;
- clear prices and policies;
- no fake ratings or fabricated amenities;
- written booking references in later phases;
- consistent identity across the website, Facebook, Instagram, and Google Maps.

## `docs/02_MISSION.md`

Use this controlling mission:

> Build and operate a truthful, mobile-first website that explains the actual TEN29 property, publishes only approved business claims, converts visitors into structured booking enquiries, reliably notifies the owner, and stores clean data that can support future availability, payment, and Messenger automation without a full rebuild.

## `docs/03_PRODUCT_PRINCIPLES.md`

Include these TEN29-specific principles:

1. Truth before promotion.
2. Owner approval before public claim.
3. General Trias first; Tagaytay only as truthful secondary access positioning.
4. Enquiry is not reservation.
5. Payment screenshot is not verified payment.
6. One future source of truth for every booking channel.
7. Mobile-first because Facebook and Messenger traffic will commonly arrive from phones.
8. Progressive automation, not premature automation.
9. Owner ownership of domain, accounts, data, and production infrastructure.
10. Residential-property privacy and guest-data minimization.
11. No fake reviews, fake urgency, invented scarcity, or fabricated social proof.
12. Clear upgrade boundaries so Option 1 is not misrepresented as Option 2 or Option 3.
13. Accessible design and plain-language guest communication.
14. Operational reliability over decorative complexity.
15. Every public statement must be traceable to a claim record.

---

# 6. BUSINESS POSITIONING

Create `docs/04_BUSINESS_POSITIONING.md`.

## Proposed positioning

Classify the following as `PROPOSED_PENDING_APPROVAL`:

> TEN29 Holiday Homes is a modern private whole-home stay in Biclatan, General Trias, designed primarily for small families and groups seeking a comfortable place to rest, reconnect, and spend time together.

## Proposed tagline

Classify as `PROPOSED_PENDING_APPROVAL`:

> Comfortable stays. Memorable moments. A place that feels like home.

## Proposed primary audiences

- Families visiting relatives in Cavite
- Small family or barkada groups
- Couples or families seeking a quiet weekend stay
- Balikbayan families
- Guests attending weddings, graduations, reunions, or family events nearby
- Guests using General Trias as a base for Cavite trips

## Not the initial positioning

- Large private resort
- Event venue
- Party house
- Twenty-person reunion property
- Hotel with twenty-four-hour reception
- Property located in Tagaytay
- Airbnb property unless an actual listing is created

## Location language

Allowed after owner approval:

> Located in Biclatan, General Trias, with road access toward Amadeo and Tagaytay.

Never write:

- "Located in Tagaytay"
- "Tagaytay accommodation"
- "Minutes away from Sky Ranch"
- an exact travel time without verified route evidence and owner approval

---

# 7. PROPOSED OWNER-APPROVAL VALUES

Create `docs/05_OWNER_APPROVAL_MATRIX.md`.

Seed all of the following as `PROPOSED_PENDING_APPROVAL`. Do not render them publicly until they become `APPROVED_FOR_PUBLICATION`.

## Proposed guest capacity

- Base overnight capacity: 6 guests
- Maximum overnight capacity: 8 guests
- Maximum total persons on property: 10
- Children count toward occupancy
- Day visitors remain within the ten-person maximum
- Proposed indoor parking capacity: 1 vehicle
- Additional vehicles: subject to subdivision rules
- Minimum lead-guest age: 21
- Minimum stay: 1 night

## Proposed public rates

- Sunday to Thursday: PHP 4,499, up to 6 guests
- Friday: PHP 4,999, up to 6 guests
- Saturday: PHP 5,999, up to 6 guests
- Declared public holiday: PHP 6,499, up to 6 guests
- Peak holiday period: from PHP 6,999, up to 6 guests
- Additional overnight guest: PHP 500 each
- Maximum additional overnight guests: 2
- Refundable security deposit: PHP 2,000
- Early check-in: PHP 500 per approved hour
- Late check-out: PHP 500 per approved hour
- Excessive cleaning: documented actual charge
- Lost key/access device: documented replacement cost
- Damage: documented repair or replacement cost

## Proposed promotions

- Two consecutive nights: PHP 500 off total accommodation
- Three or more nights: 10% off accommodation
- Optional first-ten-completed-bookings weekday launch rate: PHP 3,999
- Returning verified guest: 5% accommodation discount

## Proposed hours and schedule

- Booking-enquiry support: 8:00 AM to 9:00 PM daily
- Check-in: 2:00 PM
- Check-out: 11:00 AM
- Quiet hours: 10:00 PM to 7:00 AM

## Proposed payment rules

- More than three days before arrival: 50% reservation deposit
- Within three days of arrival: full accommodation payment
- Same-day request: full payment before confirmation
- Remaining balance due three days before check-in
- Proposed initial channels: GCash and bank transfer
- Approved cash may be accepted only for an authorized remaining balance or security deposit
- Payment-account name and number remain unverified and must never be placed in source control
- A screenshot is never enough to mark payment as verified

## Proposed hold and confirmation rules for future phases

These are documented for the Option 2 roadmap, not implemented as Option 1 functionality:

- Quote does not reserve a date
- Four-hour tentative payment hold
- Booking becomes confirmed only after required payment is verified
- Expired unpaid hold releases the date
- One confirmed booking cannot overlap another

## Proposed cancellation policy

- 14 days or more before check-in: 90% accommodation refund or one free reschedule
- 7 to 13 days: 50% accommodation refund or one free reschedule
- Less than 7 days: non-refundable
- No-show: non-refundable
- Early departure: unused nights non-refundable
- One reschedule per booking
- Rescheduled stay used within 90 days
- Higher-priced replacement date requires payment of the difference
- Lower-priced replacement date does not automatically create a cash refund
- Official safety/access restriction: booking credit and one fee-free reschedule
- TEN29 operational cancellation: full refund

## Proposed house rules

- Registered guests and approved visitors only
- Lead guest responsible for the group
- Minors supervised by adults
- Quiet hours observed
- Loud outdoor speakers and disruptive behavior prohibited
- Videoke not initially included
- Parties, commercial shoots, ticketed events, and large celebrations require a separate written agreement
- Indoor smoking and vaping prohibited
- Illegal substances and unlawful activity prohibited
- No pets during initial operations
- Exterior CCTV may cover entrances and parking only
- No cameras in bedrooms, bathrooms, or private indoor areas
- Lead guest may be required to provide one valid government-issued ID at the appropriate booking stage
- Damage and excessive cleaning deductions require evidence and explanation

## Mandatory factual fields that remain blank until verified

- Actual number of bedrooms
- Actual bed types and quantities
- Actual number of bathrooms
- Actual maximum safe occupancy
- Actual parking capacity
- Wi-Fi details
- Air-conditioning details
- Kitchen appliances
- Television/entertainment
- Pool or subdivision amenity access
- Pet approval
- Event approval
- Towels and toiletries
- Accessibility limitations
- CCTV locations
- Fire extinguisher
- Smoke detectors
- First-aid kit
- Emergency exits
- Backup water/electricity arrangements
- Business permit
- Barangay clearance
- BIR registration
- DTI/SEC record where applicable
- HOA/subdivision short-stay permission
- Tourism registration/accreditation
- Owner/operator authorization
- Official payment-account holder
- Original photo rights

---

# 8. DIGITAL-PRESENCE REPAIR WORKSTREAM

Create `docs/06_DIGITAL_PRESENCE_REPAIR.md`.

This is a documented external workstream, not something to automate from this repository.

## Proposed final Facebook configuration

- Name: TEN29 Holiday Homes
- Category: Vacation Home Rental, or the closest valid holiday-home category
- Remove dine-in
- Remove curbside pickup
- Remove food specialties
- Remove pound-sign pricing
- Replace "Always open" unless genuine twenty-four-hour support exists
- Proposed enquiry hours: 8:00 AM to 9:00 PM daily
- Add the final website after launch
- Add the final business email after creation
- Use the approved location copy
- Keep Messenger as an enquiry channel

## Proposed final Instagram configuration

- Name: TEN29 Holiday Homes
- Category: Vacation Home Rental or closest accommodation category
- Remove Chicken Joint association where the owner controls the record
- Remove food-service metadata
- Connect the official Facebook Page
- Use the same name, phone, location, and website

## Proposed final Google Business Profile configuration

- Standardize capitalization to TEN29 Holiday Homes
- Review whether `Vacation Home Rental` is a more accurate category than `Hotel`
- Add the official website after launch
- Add approved original images
- Add approved amenities only
- Add approved booking/support hours
- Use the same phone and general location
- Begin review collection only after genuine completed stays

## Page-history audit

Document the need to capture:

- Page creation date
- previous Page names
- username history
- Page merge history
- managing countries
- whether the Page previously represented a food business

Do not accuse the business of buying followers or misleading customers. Record only verified platform history.

---

# 9. OPTION 1 USER EXPERIENCE

Create `docs/07_INFORMATION_ARCHITECTURE.md` and `docs/08_USER_FLOWS.md`.

## Public routes

Implement:

- `/`
- `/property`
- `/gallery`
- `/rates`
- `/availability`
- `/policies`
- `/location`
- `/faq`
- `/book`
- `/contact`
- `/privacy`
- `/terms`

## Admin routes

Implement:

- `/admin/login`
- `/admin`
- `/admin/inquiries`
- `/admin/inquiries/[id]`
- `/admin/owner-preview`
- `/admin/claims`

Protect every `/admin` route.

## Public homepage sections

1. Navigation
2. Hero
3. TEN29 introduction
4. Verified or approved property highlights
5. Gallery preview
6. How the Option 1 enquiry process works
7. Approved rates preview or a transparent "rates pending approval" state
8. Location positioning
9. Frequently asked questions preview
10. Booking-enquiry call to action
11. Messenger, telephone, and map contact options
12. Footer with privacy, terms, and truthful business information

## Proposed hero copy

Keep this approval-gated:

Headline:

> Your private place to rest, reconnect, and feel at home.

Supporting copy:

> A modern holiday-home stay in Biclatan, General Trias for small families and groups.

Primary CTA:

> Request Your Dates

Secondary CTA:

> View Property

If the private-whole-home positioning is not approved, use a safer verified fallback:

> Discover TEN29 Holiday Homes in Biclatan, General Trias.

## Option 1 enquiry flow

1. Guest arrives from Google, Facebook, Messenger, or a direct link.
2. Guest reviews approved property information.
3. Guest opens `/book` or `/availability`.
4. Guest enters requested stay dates and group details.
5. The application validates the request.
6. The application persists the inquiry first.
7. The application generates a human-readable inquiry reference.
8. The application attempts owner notification email.
9. Email failure is logged without deleting or rejecting the stored inquiry.
10. The guest sees a success page that clearly states:
    - the request was received;
    - the date is not reserved;
    - the stay is not confirmed;
    - TEN29 will reply with verified availability, price, and payment instructions.
11. If an email address was supplied, the guest receives an acknowledgement email.
12. The owner reviews the inquiry in the admin dashboard and contacts the guest manually.
13. Payment and final confirmation remain outside the Option 1 website.

## Facebook-to-website flow in Option 1

There is no Meta API integration in Option 1.

Support this controlled manual flow:

- Facebook posts and Messenger replies can send guests to:
  - `/book?source=facebook`
  - or a UTM-tagged equivalent.
- The form records the source.
- Facebook-only conversations that never use the website are not automatically synchronized.
- Do not label this as automated Facebook integration.

## Availability language

Never display a fake live calendar.

The availability page must explain:

> Dates shown or requested through this website are subject to manual confirmation. Submitting an enquiry does not place a hold or create a reservation.

---

# 10. BOOKING-ENQUIRY DATA MODEL

Create `docs/09_DATA_MODEL.md`.

Implement only what Option 1 needs, but document future entities separately.

## Option 1 inquiry entity

Suggested fields:

- `id`
- `reference_code`
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `full_name`
- `email`
- `mobile_number`
- `check_in_date`
- `check_out_date`
- `adults`
- `children`
- `day_visitors`
- `vehicles`
- `purpose_of_stay`
- `message`
- `privacy_consent`
- `status`
- `owner_notes`
- `notification_status`
- `notification_error`
- `created_at`
- `updated_at`
- `contacted_at`
- `closed_at`

## Option 1 inquiry statuses

- `NEW`
- `REVIEWING`
- `CONTACTED`
- `CLOSED`
- `SPAM`

Do not create booking-confirmed, paid, checked-in, or completed statuses in the Option 1 inquiry table because Option 1 is not yet the booking system.

## Option 1 audit events

Track:

- inquiry created
- notification attempted
- notification delivered
- notification failed
- status changed
- note changed
- inquiry viewed by admin, where practical

## Future Option 2 entities

Document but do not fully implement:

- `guests`
- `bookings`
- `booking_status_history`
- `availability_blocks`
- `date_holds`
- `rate_plans`
- `payments`
- `payment_evidence`
- `security_deposit_ledger`
- `refunds`
- `policy_versions`
- `audit_logs`

## Future Option 3 entities

Document but do not fully implement:

- `messaging_contacts`
- `messaging_identities`
- `conversations`
- `messages`
- `lead_scores`
- `automation_runs`
- `payment_gateway_events`
- `webhook_events`
- `notification_jobs`

---

# 11. TECHNICAL ARCHITECTURE

Create `docs/10_TECHNICAL_ARCHITECTURE.md`.

## Required stack

- Next.js using the App Router
- TypeScript with strict mode
- Tailwind CSS
- React Server Components by default
- Client Components only where browser interactivity requires them
- Supabase PostgreSQL for production data
- Supabase Auth for admin authentication
- Official Supabase SSR approach for Next.js
- Supabase SQL migrations stored in the repository
- Resend for transactional email
- Zod for validation
- Vercel for production hosting
- Cloudflare Registrar and DNS for the proposed domain
- Google Workspace for the optional business mailbox
- Cloudflare R2 reserved for later media/document storage where needed

Do not introduce Prisma merely from habit. For this project, prefer Supabase SQL migrations and generated TypeScript database types so authentication, row-level security, and the hosted PostgreSQL service stay coherent.

## Application rules

- Use `src/`.
- Use absolute imports through `@/`.
- Use server actions or route handlers for secure mutation.
- Validate all form data on the server.
- Persist the inquiry before sending email.
- Never expose the Supabase service-role key to the browser.
- Treat email as a notification channel, not the system of record.
- Use a repository pattern or service layer so Supabase access is not scattered across UI components.
- Isolate email-provider logic behind an interface.
- Isolate business-content claims from presentation components.
- Keep public content separate from admin logic.
- Use environment-based canonical URLs.
- Use secure cookies and server-side session validation for admin.
- Add row-level security policies.
- Create typed database definitions.
- Do not log guest personal information unnecessarily.

## Suggested repository structure

```text
ten29-holiday-homes/
├─ CLAUDE.md
├─ README.md
├─ CHANGELOG.md
├─ CONTRIBUTING.md
├─ .env.example
├─ docs/
│  ├─ 00_PROJECT_CHARTER.md
│  ├─ 01_VISION.md
│  ├─ 02_MISSION.md
│  ├─ 03_PRODUCT_PRINCIPLES.md
│  ├─ 04_BUSINESS_POSITIONING.md
│  ├─ 05_OWNER_APPROVAL_MATRIX.md
│  ├─ 06_DIGITAL_PRESENCE_REPAIR.md
│  ├─ 07_INFORMATION_ARCHITECTURE.md
│  ├─ 08_USER_FLOWS.md
│  ├─ 09_DATA_MODEL.md
│  ├─ 10_TECHNICAL_ARCHITECTURE.md
│  ├─ 11_FUNCTIONAL_REQUIREMENTS.md
│  ├─ 12_NON_FUNCTIONAL_REQUIREMENTS.md
│  ├─ 13_CONTENT_AND_CLAIM_STANDARD.md
│  ├─ 14_DESIGN_SYSTEM.md
│  ├─ 15_SECURITY_AND_PRIVACY.md
│  ├─ 16_TEST_STRATEGY.md
│  ├─ 17_SEO_AND_ANALYTICS.md
│  ├─ 18_DEPLOYMENT_AND_OPERATIONS.md
│  ├─ 19_UPGRADE_ROADMAP.md
│  ├─ 20_RISK_REGISTER.md
│  ├─ 21_DECISION_LOG.md
│  ├─ 22_DEFINITION_OF_DONE.md
│  ├─ 23_OWNER_HANDOVER.md
│  ├─ 24_ASSET_REQUIREMENTS.md
│  └─ 25_EXECUTION_LOG.md
├─ public/
│  └─ images/
│     ├─ placeholders/
│     └─ ten29/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ content/
│  ├─ features/
│  ├─ lib/
│  ├─ services/
│  ├─ types/
│  └─ styles/
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
└─ scripts/
```

Adapt this where Next.js conventions require, but preserve clear separation.

---

# 12. FUNCTIONAL REQUIREMENTS

Create `docs/11_FUNCTIONAL_REQUIREMENTS.md`.

Assign IDs such as `FR-PUB-001`, `FR-INQ-001`, and `FR-ADM-001`.

At minimum include and implement:

## Public

- Responsive navigation
- Accessible mobile menu
- Brand introduction
- Approved claim rendering
- Gallery with descriptive alt text
- Rates page with approval state
- Policies page with approval state
- Location page with General Trias-first wording
- FAQ
- Contact actions
- Messenger link
- Telephone link
- Google Maps link through configurable environment/content value
- Enquiry form
- Enquiry success state
- Privacy consent
- SEO metadata
- Sitemap
- Robots
- Custom not-found page
- Error boundary
- Loading states

## Enquiry

- Server validation
- Check-out after check-in
- Sensible maximum date range
- Guest count validation
- Required name and mobile number
- Optional email with validation
- Required consent
- Honeypot spam defense
- Submission timestamp checks or equivalent lightweight anti-bot defense
- Unique human-readable reference code
- Persist-before-notify rule
- Owner notification
- Guest acknowledgement
- Source and UTM capture
- Duplicate rapid-submit protection
- Friendly failure handling
- No booking-confirmation language

## Admin

- Secure login
- Protected routes
- Dashboard counts
- Inquiry list
- Search and filters
- Inquiry detail
- Status updates
- Owner notes
- Notification state
- Basic export to CSV
- Owner-preview page
- Claim registry view
- Sign out

Do not implement public self-registration for admin users.

---

# 13. NON-FUNCTIONAL REQUIREMENTS

Create `docs/12_NON_FUNCTIONAL_REQUIREMENTS.md`.

Include measurable targets.

## Accessibility

- WCAG 2.2 AA-oriented implementation
- Keyboard-operable navigation and forms
- Visible focus states
- Sufficient contrast
- Semantic headings
- Proper labels and errors
- Reduced-motion support
- No information communicated by color alone

## Performance

- Mobile-first
- Optimize local images
- Use responsive image sizes
- Avoid large client-side bundles
- Prefer Server Components
- Avoid autoplay video
- Target strong Lighthouse performance without sacrificing honesty or accessibility
- Document actual measured results rather than fabricating scores

## Reliability

- Stored inquiry survives email-provider failure
- Idempotent or duplicate-resistant submissions
- Graceful database/email errors
- No silent failure
- Useful server logs without unnecessary personal data
- Production health-check or diagnostic route protected as appropriate

## Maintainability

- Strict TypeScript
- Small focused modules
- No repeated business constants
- No hard-coded secret values
- Documented setup
- Automated lint, typecheck, tests, and build
- Upgrade boundaries documented

## Security

- Server-side validation
- Safe output rendering
- Authenticated admin access
- Row-level security
- Principle of least privilege
- Secure headers
- No service keys in client bundle
- No guest data in static generation
- Rate-limiting strategy documented
- Audit events for admin changes

---

# 14. CONTENT AND CLAIM STANDARD

Create `docs/13_CONTENT_AND_CLAIM_STANDARD.md`.

## Voice

- Calm
- trustworthy
- welcoming
- clear
- locally grounded
- not exaggerated
- not luxury-for-the-sake-of-luxury
- not generic travel copy

## Required distinctions

Always distinguish:

- enquiry versus reservation
- quoted price versus approved public rate
- submitted proof versus verified payment
- General Trias location versus Tagaytay access
- proposed amenity versus working amenity
- follower count versus completed-stay review evidence

## Prohibited copy

Do not publish:

- "best staycation"
- "number one"
- "luxury" without owner approval and real evidence
- "near all Tagaytay attractions"
- "minutes away" without verified time
- "always available"
- "instant confirmation"
- "secure payment" when no gateway exists
- fake testimonials
- fake ratings
- fake recent bookings
- fake scarcity
- fake guest names

## Temporary content states

Build clear components for:

- awaiting owner approval
- information coming soon
- request verified rates
- ask about availability
- gallery assets pending
- policy pending approval

Do not show internal approval terminology to ordinary guests. Translate it into polished public language.

---

# 15. DESIGN SYSTEM

Create `docs/14_DESIGN_SYSTEM.md` and implement it.

## Brand direction

Use a premium but grounded hospitality look based on the visible TEN29 branding:

- warm ivory background
- dark forest green
- muted gold
- soft charcoal text
- formal borders
- generous spacing
- restrained shadows
- elegant typography
- clean mobile cards
- no loud gradients
- no generic blue SaaS dashboard appearance

## Proposed color tokens

Refine for accessibility, but begin with:

- `--ten29-forest: #0E3A2F`
- `--ten29-forest-deep: #08281F`
- `--ten29-gold: #B88A2F`
- `--ten29-gold-soft: #D8BF82`
- `--ten29-ivory: #F8F5EC`
- `--ten29-sand: #ECE4D4`
- `--ten29-ink: #17241F`
- `--ten29-muted: #66736D`
- `--ten29-white: #FFFFFF`
- success, warning, danger, and border tokens with accessible contrast

## Typography

Use `next/font` with:

- an elegant serif for major headings;
- a highly readable sans-serif for body and interface text.

Choose stable Google fonts supported by Next.js, such as a Cormorant/Playfair-style heading font and Manrope/Inter-style body font. Record the actual choice.

## Temporary identity

Until the official high-resolution logo is supplied:

- use a tasteful typographic TEN29 wordmark;
- label it as temporary in documentation;
- do not trace or recreate a low-resolution screenshot as the official logo;
- make replacement easy through one component.

## Components

Build reusable:

- header
- footer
- mobile menu
- hero
- section heading
- CTA
- claim-aware fact display
- gallery card
- rate card
- policy card
- FAQ accordion
- contact card
- enquiry form
- form field
- alert
- empty state
- admin table
- status badge
- owner-preview panel

## Responsive behavior

Design first for common mobile widths, then tablet and desktop.

---

# 16. SECURITY AND PRIVACY

Create `docs/15_SECURITY_AND_PRIVACY.md`.

## Option 1 data collected

Only collect what is needed for an initial enquiry:

- name
- mobile number
- optional email
- requested dates
- adults
- children
- day visitors
- vehicles
- purpose of stay
- optional message
- privacy consent
- source attribution

Do not collect in Option 1:

- government ID
- payment proof
- bank account
- card data
- full residential address
- birth date
- unnecessary sensitive personal data

## Required safeguards

- Privacy notice specific to TEN29's enquiry workflow
- Explain purpose of collection
- Explain that the enquiry is not a confirmed booking
- Explain contact and retention practices
- Provide a placeholder privacy contact until the owner approves the final address
- Validate and sanitize
- Use secure server-side access
- Avoid logging personal fields
- Add retention as a documented proposed rule, not an invented legal claim
- Recommend a twelve-month enquiry-retention default as `PROPOSED_PENDING_APPROVAL`
- Provide delete/export administration procedure
- Never expose the exact block and lot unnecessarily
- Keep payment and ID storage out of Option 1

## Admin security

- No open registration
- Initial admin creation documented
- Strong password policy
- Secure password-reset procedure
- Server-side route protection
- RLS
- Session handling through official Supabase SSR patterns
- Audit status and note changes
- Disable production owner-preview for unauthorized users

---

# 17. SEO AND ANALYTICS

Create `docs/17_SEO_AND_ANALYTICS.md`.

Implement:

- unique metadata per route
- title templates
- meta descriptions
- canonical URLs
- Open Graph
- social preview fallback
- sitemap
- robots
- clean semantic URLs
- correct heading hierarchy
- local location terms centered on Biclatan and General Trias
- environment-configured verification tokens
- analytics abstraction, disabled until configured
- UTM capture
- inquiry source tracking

## Structured data

Use only truthful, supported structured data.

- Use a conservative `LocalBusiness` or appropriate lodging-oriented schema representation based on approved facts.
- Do not claim ratings or reviews.
- Do not add unapproved prices, occupancy, amenities, or exact address.
- Do not assume eligibility for Google's specialized VacationRental rich results.
- Add tests or validation guidance for JSON-LD.

## Proposed keyword themes

Document, but do not keyword-stuff:

- holiday home General Trias
- staycation General Trias
- private stay Biclatan
- family stay Cavite
- accommodation near Amadeo
- General Trias holiday home

Use "near Tagaytay" carefully and secondarily.

---

# 18. TEST STRATEGY

Create `docs/16_TEST_STRATEGY.md`.

Configure:

- ESLint
- TypeScript typecheck
- Vitest
- React Testing Library
- Playwright
- production build verification

## Required automated tests

1. Public pages do not render proposed/unverified claims.
2. Approved claims render.
3. Enquiry validation rejects invalid dates.
4. Enquiry validation rejects negative or impossible guest counts.
5. Enquiry is stored before email is sent.
6. Email failure leaves a stored enquiry with failure status.
7. Success copy does not say booking confirmed or date reserved.
8. Admin routes reject unauthenticated users.
9. Admin can view inquiries.
10. Admin status updates are validated.
11. UTM/source values are captured safely.
12. Honeypot submissions are rejected or ignored.
13. Canonical metadata resolves from environment configuration.
14. No fake review/rating content exists in production fixtures.

## Manual acceptance checklist

- Android mobile browser
- iPhone-sized viewport
- desktop
- keyboard navigation
- screen-reader labels
- slow network
- email-provider failure
- database failure
- empty gallery
- no approved rates
- no approved policies
- long guest message
- duplicate rapid submission

---

# 19. DEPLOYMENT AND OPERATIONS

Create `docs/18_DEPLOYMENT_AND_OPERATIONS.md`.

## Production ownership

All production accounts must belong to TEN29 or the owner's official email:

- Cloudflare
- domain
- Vercel
- Supabase
- Resend
- Google Workspace
- future R2
- future OpenAI
- future Meta developer app
- future PayMongo

The developer receives only the access necessary to build and maintain.

## Option 1 recurring structure

Document current expected structure without converting it into a guarantee:

Required:

- Vercel Pro for commercial hosting
- domain registration/renewal at registrar checkout

Free or low-volume launch tiers:

- Supabase Free pilot
- Resend Free
- R2 not required unless used
- Google Workspace optional but recommended

## Supabase Free warning

Document that free-tier production use has limitations and may be paused for inactivity. Email notifications must remain an operational fallback, and an upgrade to Supabase Pro is part of Option 2 or can be purchased earlier if TEN29 needs stronger reliability.

## Environments

Document:

- local development
- preview/staging
- production

## Environment variables

Create a complete `.env.example`, including:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="TEN29 Holiday Homes"

NEXT_PUBLIC_PHONE_DISPLAY="0961 586 8106"
NEXT_PUBLIC_PHONE_E164="+639615868106"

NEXT_PUBLIC_FACEBOOK_URL=
NEXT_PUBLIC_GOOGLE_MAPS_URL=
NEXT_PUBLIC_INSTAGRAM_URL=

NEXT_PUBLIC_PUBLIC_ADDRESS="Holiday Homes, Biclatan, General Trias, Cavite 4107"

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
INQUIRY_NOTIFICATION_TO=
INQUIRY_FROM_EMAIL=
PRIVACY_CONTACT_EMAIL=

NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_OWNER_PREVIEW=false

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Use the provider's actual preferred variable names where required, but maintain clear documentation.

## Backups and recovery

- Document Supabase Free limitations.
- Export or backup enquiries before migrations.
- Keep migrations in source control.
- Include recovery steps.
- Never treat email inbox as the only database.
- Never treat the database as the only notification channel.

---

# 20. UPGRADE ROADMAP

Create `docs/19_UPGRADE_ROADMAP.md`.

## Phase 1 / Option 1

Commercial scope: PHP 35,000 one-time development price.

Capabilities:

- professional website
- approved rates and policies
- booking-enquiry form
- basic protected enquiry dashboard
- Messenger, phone, and map links
- manual availability confirmation
- manual GCash/bank-transfer process
- no live booking calendar
- no automated payment confirmation

## Phase 2 / Upgrade to Option 2

Indicative additional development: PHP 35,000, subject to later scope and provider changes.

Target capabilities:

- Supabase Pro production database
- master availability calendar
- website and manually entered Facebook/phone bookings in one system
- booking references
- date holds
- double-booking prevention
- guest records
- full booking statuses
- payment-proof upload
- manual verification workflow
- deposit, balance, and security-deposit tracking
- cancellation and rescheduling records
- arrival/departure dashboard
- audit log
- staff roles

## Phase 3 / Upgrade to Option 3

Indicative additional development: PHP 50,000, subject to later scope, Meta review, merchant approval, API changes, and usage requirements.

Target capabilities:

- Meta Messenger Platform integration
- AI Messenger assistant
- approved knowledge base
- lead qualification
- live calendar checks
- website continuation links
- unified lead identity
- human handoff
- PayMongo or approved gateway
- payment webhooks
- automated payment status
- automated confirmation
- reminders
- analytics and reports

## Architecture rule

Option 1 must not need to be discarded.

Preserve:

- domain
- brand system
- public routes
- content model
- enquiry records
- admin authentication
- database migrations
- service abstractions
- analytics/source fields

Upgrade through additive modules and controlled migrations.

---

# 21. RISK REGISTER

Create `docs/20_RISK_REGISTER.md`.

Include at least:

- Unapproved rates accidentally published
- Incorrect guest capacity
- Incorrect amenity claims
- Copied images
- Exact residential address overexposure
- Restaurant metadata remaining online
- Website presented as live booking system when it is only enquiry
- Lost enquiry due to email failure
- Supabase Free project pausing
- Admin credential compromise
- Spam form submissions
- Public disclosure of service-role key
- Owner account ownership not established
- Domain purchased under developer account
- Google/Meta account access loss
- Upgrade scope creep
- Payment automation attempted before merchant approval
- AI answering outside approved knowledge
- Tagaytay wording misleading customers
- Fake or prematurely displayed reviews
- Unsupported browser/mobile layout
- Owner assumes hosting includes maintenance
- Third-party price changes

For each risk include probability, impact, mitigation, owner, and status.

---

# 22. DECISION LOG

Create `docs/21_DECISION_LOG.md`.

Seed dated decisions:

- 2026-07-27: New maintainable website required because old website is unavailable and original IT support is gone.
- 2026-07-27: Proposed domain is `ten29holidayhomes.com`, pending availability and owner purchase.
- 2026-07-27: Start with Option 1 at PHP 35,000.
- 2026-07-27: Build Option 1 with an upgrade-ready architecture.
- 2026-07-27: Option 2 is a later additive upgrade, not a replacement.
- 2026-07-27: Option 3 is a later AI/payment upgrade.
- 2026-07-27: Owner approval is required before proposed business values become public.
- 2026-07-27: Website bookings are enquiries only in Option 1.
- 2026-07-27: Facebook integration in Option 1 is a link/manual continuation, not an API integration.
- 2026-07-27: General Trias is the primary location identity; Tagaytay is secondary route positioning only.
- 2026-07-27: No copied attraction imagery.

---

# 23. ASSET REQUIREMENTS

Create `docs/24_ASSET_REQUIREMENTS.md`.

List exact assets needed from the owner before final launch:

- Official logo in SVG or transparent PNG
- Original exterior images
- Original living-room images
- Original bedroom images
- Original bathroom images
- Original kitchen/dining images
- Parking/entrance image
- Amenity images
- Safety-equipment images
- Optional property walkthrough video
- Written image-use permission
- Final Facebook URL
- Final Google Maps share URL
- Final Instagram URL
- Approved business email
- Approved privacy contact
- Approved public address detail
- Approved room/bed/bath data
- Approved capacity
- Approved amenities
- Approved rates
- Approved payment wording
- Approved house rules
- Approved cancellation policy
- Approved logo usage

Provide file naming guidance and image dimensions.

---

# 24. OPTION 1 IMPLEMENTATION DETAILS

After documentation is created, implement the working application.

## Initialization

Use the current stable Next.js scaffold in the existing root with:

- TypeScript
- ESLint
- Tailwind
- App Router
- `src` directory
- import alias `@/*`

Do not generate a nested application folder.

## Content registry

Create a typed content system with:

- business profile
- contact details
- location
- social links
- claim states
- approved/proposed values
- publication rules

Include a helper such as:

- `isPublicClaim()`
- `getPublicClaim()`
- `getOwnerPreviewClaims()`

## Public fallback states

Where no owner-approved values exist:

### Rates

> Rates are currently being finalized. Send your preferred dates and group details to receive a verified quotation.

### Availability

> Availability is confirmed manually. Your enquiry does not reserve a date.

### Amenities

> The complete amenity list will be published after final property verification.

### Policies

> Final stay policies are being reviewed. TEN29 will provide the applicable rules before payment.

These are transparent, not generic filler.

## Enquiry reference

Create readable references such as:

`TEN29-20260727-AB12`

Do not use sequential public database IDs alone.

## Email content

### Owner notification

Include:

- inquiry reference
- guest name
- mobile
- optional email
- dates
- group counts
- vehicles
- purpose
- message
- source
- admin-dashboard link

### Guest acknowledgement

Must state:

- enquiry received
- reference code
- requested dates
- not a reservation
- not yet confirmed
- do not send payment until TEN29 supplies verified instructions
- official contact number

## Basic admin dashboard

Dashboard cards:

- new
- reviewing
- contacted
- closed
- notification failures

Filters:

- status
- requested check-in
- source
- text search

Do not expose the admin dashboard in navigation or sitemap.

## Owner preview

Build an authenticated preview that shows:

- verified claims
- proposed rates
- proposed capacity
- proposed policies
- missing factual fields
- publication status
- clear approve/reject workflow or, if approval mutation is too much for Option 1, a controlled read-only review plus documented process

If approval editing is implemented, record:

- approver
- time
- previous state
- new state

---

# 25. README AND CLAUDE.MD

## README

Create a useful `README.md` containing:

- project purpose
- Option 1 scope
- exclusions
- tech stack
- local setup
- environment variables
- Supabase setup
- migrations
- seed procedure
- tests
- build
- deployment
- claim approval system
- upgrade roadmap
- account ownership rule
- current known limitations

## CLAUDE.md

Create a permanent root `CLAUDE.md` summarizing:

- TEN29 facts
- Option 1 boundaries
- claim-gate rules
- no invented business facts
- no copied images
- General Trias location rule
- enquiry-not-booking rule
- payment-proof-not-payment rule
- code conventions
- test commands
- documentation update requirements
- upgrade path
- never create nested project folder
- never commit secrets
- never change external accounts without authorization

---

# 26. QUALITY GATES

Do not declare completion until these pass:

- install succeeds
- lint passes
- typecheck passes
- unit/integration tests pass
- Playwright critical flow passes or any environment limitation is documented
- production build passes
- public pages do not expose unapproved proposed claims
- form submission persists correctly
- email failure path is tested
- admin route protection is tested
- no service key is present in client code
- no random remote property images are used
- no fake review or rating is shown
- no page says a submitted enquiry is confirmed
- no public content says TEN29 is located in Tagaytay
- README and CLAUDE.md are complete
- execution log reflects actual commands and outcomes

Add scripts similar to:

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Use actual script names that work.

---

# 27. DEFINITION OF DONE

Create `docs/22_DEFINITION_OF_DONE.md`.

The project is done for Option 1 when:

1. TEN29 has a production-ready public website codebase.
2. The site is specific to TEN29, not a generic rental template.
3. All proposed claims are approval-gated.
4. Public content states Biclatan, General Trias accurately.
5. Visitors can submit structured availability/booking enquiries.
6. Enquiries are stored.
7. Owner notifications are attempted after persistence.
8. Admin can securely review and manage enquiries.
9. The guest is never falsely told that the date is reserved.
10. Payment remains manual and outside Option 1.
11. Privacy, terms, SEO, testing, deployment, and handover documentation exist.
12. The code can accept Option 2 modules without replacing the public site.
13. The repository contains no secrets or real guest data.
14. The final owner asset and approval gaps are clearly listed.
15. Build, lint, typecheck, and tests pass.

---

# 28. IMPLEMENTATION PHASE ORDER

Execute in this order.

## Phase 0 — Workspace and scaffold

- inspect root
- initialize Git if needed
- scaffold Next.js in current directory
- record versions
- confirm dev server/build baseline

## Phase 1 — Project operating system

- create CLAUDE.md
- create all required docs
- create decision log
- create claim register and approval matrix
- create execution log

## Phase 2 — Design and public shell

- global tokens
- typography
- header/footer
- routes
- responsive page shells
- temporary wordmark
- placeholders

## Phase 3 — Claim-aware content

- typed claim registry
- public claim gate
- owner preview
- approved/fallback content states
- tests

## Phase 4 — Supabase and admin auth

- migrations
- RLS
- typed clients
- admin auth
- protected routes
- local setup documentation

## Phase 5 — Enquiry workflow

- validated form
- persistence
- reference generation
- source tracking
- notification service
- acknowledgement service
- failure handling
- tests

## Phase 6 — Admin dashboard

- counts
- list
- filters
- details
- status
- notes
- CSV export
- notification-state visibility

## Phase 7 — SEO, privacy, accessibility

- metadata
- sitemap
- robots
- JSON-LD
- privacy
- terms
- accessibility review
- performance review

## Phase 8 — QA and handover

- lint
- typecheck
- tests
- e2e
- build
- documentation reconciliation
- owner approval list
- deployment checklist
- final report

Do not skip directly to decorative homepage work while the claim gate and operating documents remain undefined.

---

# 29. FINAL RESPONSE FORMAT

After completing as much as possible in the local repository, respond with:

## Completed

- concise list of implemented phases
- main routes
- main capabilities
- documents created

## Architecture

- stack actually installed
- database/auth/email approach
- claim-gate implementation
- upgrade-readiness decisions

## Validation

- commands run
- lint result
- typecheck result
- tests result
- build result

## Owner approvals still required

List only factual/publication gates, not generic discovery questions.

## Credentials or external setup still required

- Supabase
- Resend
- Cloudflare/domain
- Vercel
- Google Workspace
- social/map URLs

## Run locally

Exact commands.

## Next controlled action

One recommended next step only.

Begin now. Inspect the empty workspace, initialize the project in the current root, create the project operating system, and implement Option 1 without inventing unapproved business facts.
