# 00 — Project Charter

## Project name

TEN29 Holiday Homes Digital Launch and Upgrade-Ready Booking Foundation

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
