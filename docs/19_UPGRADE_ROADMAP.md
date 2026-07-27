# 19 — Upgrade Roadmap

## Phase 1 / Option 1 — this repository, current state

Commercial scope: PHP 35,000 one-time development price.

Capabilities: professional website; approved rates and policies; booking-enquiry form; basic protected enquiry dashboard; Messenger, phone, and map links; manual availability confirmation; manual GCash/bank-transfer process. No live booking calendar. No automated payment confirmation.

## Phase 2 / Upgrade to Option 2

Indicative additional development: PHP 35,000, subject to later scope and provider changes.

Target capabilities: Supabase Pro production database; master availability calendar; website and manually entered Facebook/phone bookings unified in one system; booking references; date holds; double-booking prevention; guest records; full booking statuses; payment-proof upload; manual verification workflow; deposit, balance, and security-deposit tracking; cancellation and rescheduling records; arrival/departure dashboard; audit log; staff roles.

## Phase 3 / Upgrade to Option 3

Indicative additional development: PHP 50,000, subject to later scope, Meta review, merchant approval, API changes, and usage requirements.

Target capabilities: Meta Messenger Platform integration; AI Messenger assistant; approved knowledge base; lead qualification; live calendar checks; website continuation links; unified lead identity; human handoff; PayMongo or approved gateway; payment webhooks; automated payment status; automated confirmation; reminders; analytics and reports.

## Architecture rule

Option 1 must not need to be discarded. Upgrades are additive.

Preserved across upgrades: domain; brand system; public routes; content model; enquiry records; admin authentication; database migrations; service abstractions; analytics/source fields.

## How the current codebase supports this

- `inquiries` is designed so Option 2's `bookings` table can reference `inquiries.id` without altering its columns' meaning.
- The service-layer abstraction (`src/services/*`) means Option 2's calendar/payment logic is added as new services, not a rewrite of existing ones.
- The claim registry (`src/content/claims.ts`) already has slots for Option 2/3 concepts (hold rules, cancellation policy) recorded as `PROPOSED_PENDING_APPROVAL`, ready to activate without a schema change to the claim system itself.
- Route groups separate public/admin concerns so Option 2 admin features (calendar view, payment ledger) can be added under `src/app/admin` without touching public routes.
