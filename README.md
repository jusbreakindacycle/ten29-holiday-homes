# TEN29 Holiday Homes — Website & Booking-Enquiry Foundation

TEN29's official, owner-controlled website: a truthful marketing site for the property in Biclatan, General Trias, Cavite, plus a structured booking-*enquiry* system and a basic protected admin dashboard. This is **Option 1** of a three-phase roadmap — see [docs/19_UPGRADE_ROADMAP.md](docs/19_UPGRADE_ROADMAP.md).

Read [`CLAUDE.md`](./CLAUDE.md) first — it has the non-negotiable rules for working in this repository (no invented business facts, the claim gate, enquiry-vs-booking language, etc.).

## What Option 1 is — and isn't

**In scope:** property presentation, gallery, rates/policies with approval-gated content, an availability-request explanation (not a live calendar), a booking-enquiry form with owner email notification and guest acknowledgement, a protected admin dashboard to review/manage enquiries, and upgrade-ready architecture.

**Explicitly out of scope:** instant booking, a live availability calendar, automated payment processing or gateway integration, payment-proof upload, Meta Messenger API/AI integration, OTA sync, public reviews. Full list in [docs/00_PROJECT_CHARTER.md](docs/00_PROJECT_CHARTER.md).

## Tech stack

- Next.js (App Router, TypeScript strict, `src/` directory, `@/*` alias)
- Tailwind CSS v4
- Supabase (Postgres, Auth, Row-Level Security) via `@supabase/ssr`
- Resend for transactional email
- Zod for validation
- Vitest + Testing Library (unit/integration), Playwright (e2e)
- Vercel (hosting), Cloudflare (domain/DNS)

See [docs/10_TECHNICAL_ARCHITECTURE.md](docs/10_TECHNICAL_ARCHITECTURE.md) for the full rationale.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values — never commit this file
npm run dev                  # http://localhost:3000
```

The app is designed to run and build **without** Supabase/Resend configured — public pages work, and admin pages show a clear "not configured" message instead of crashing. Provider clients are constructed lazily inside request handlers, never at module load time.

### Supabase setup

1. Create a Supabase project (owner's account — see [docs/18_DEPLOYMENT_AND_OPERATIONS.md](docs/18_DEPLOYMENT_AND_OPERATIONS.md) for account-ownership rules).
2. Run the migrations in `supabase/migrations/` in order (via the Supabase SQL editor, CLI, or your preferred migration runner).
3. Optionally run `supabase/seed.sql` locally for fabricated placeholder data — never real guest data.
4. Copy the project URL, anon key, and service-role key into `.env.local`.
5. Create the first admin user directly in Supabase Auth (Dashboard → Authentication → Users → Add user). There is no public registration route by design.

### Resend setup

1. Create a Resend account, verify a sending domain (or use their test domain for local dev).
2. Copy the API key, `INQUIRY_NOTIFICATION_TO` (owner's inbox), and `INQUIRY_FROM_EMAIL` into `.env.local`.

## Scripts

```bash
npm run dev         # local dev server
npm run lint         # ESLint
npm run typecheck   # tsc --noEmit
npm run test         # Vitest — unit + integration
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright — critical-path e2e
npm run build         # production build
```

## Tests

- `tests/unit/` — claim-gate enforcement, enquiry validation, status transitions, copy guardrails (no "confirmed booking" language, no Tagaytay-location claims, no fake reviews), site config.
- `tests/integration/` — the inquiry service against an in-memory fake Supabase client (persist-before-notify, notification failure handling, admin queries), the admin-auth decision function.
- `tests/e2e/` — Playwright critical-path coverage; see [docs/16_TEST_STRATEGY.md](docs/16_TEST_STRATEGY.md) for what requires a live Supabase project versus what runs against validation/UI alone.

## The claim-approval system

No business fact (rates, capacity, amenities, policies, positioning copy) reaches a public page unless it is `VERIFIED` or `APPROVED_FOR_PUBLICATION` in `src/content/claims.ts`. Everything else renders honest fallback copy ("rates are being finalized," etc.) instead. This is enforced in code (`isPublicClaim()`/`getPublicClaim()`), not just documentation, and covered by `tests/unit/claims.test.ts`. See [docs/05_OWNER_APPROVAL_MATRIX.md](docs/05_OWNER_APPROVAL_MATRIX.md) and [docs/13_CONTENT_AND_CLAIM_STANDARD.md](docs/13_CONTENT_AND_CLAIM_STANDARD.md).

To approve a value for publication: update its `status`, `approvedBy`, and `approvedAt` in `src/content/claims.ts`, and mirror the change in `docs/05_OWNER_APPROVAL_MATRIX.md` in the same change set.

## Upgrade roadmap

Option 1 (this repo) → Option 2 (master calendar, payment tracking, guest ledger) → Option 3 (AI Messenger, payment gateway). Each phase is additive — Option 1's domain, routes, content model, enquiry records, and admin auth are all designed to survive into later phases without a rewrite. Full detail in [docs/19_UPGRADE_ROADMAP.md](docs/19_UPGRADE_ROADMAP.md).

## Account ownership

All production accounts (Cloudflare, Vercel, Supabase, Resend, Google Workspace) belong to TEN29/the owner, never the developer. See [docs/23_OWNER_HANDOVER.md](docs/23_OWNER_HANDOVER.md).

## Known limitations (current state)

- No original property photography yet — all imagery is a neutral placeholder (`src/components/ui/PlaceholderImage.tsx`), never stock or competitor images.
- Domain, business email, and most business facts (capacity, rates, amenities, policies) are `PROPOSED_PENDING_APPROVAL` or `UNVERIFIED` pending owner sign-off — see [docs/05_OWNER_APPROVAL_MATRIX.md](docs/05_OWNER_APPROVAL_MATRIX.md) and [docs/24_ASSET_REQUIREMENTS.md](docs/24_ASSET_REQUIREMENTS.md).
- Playwright e2e coverage against a live Supabase project requires the owner's project credentials; anything not runnable without them is documented, not silently skipped.
