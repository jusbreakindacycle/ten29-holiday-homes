# TEN29 Holiday Homes

Existing Next.js application for one private holiday home: public request calendar, owner-published package rates, atomic request intake, protected owner booking operations and private media management. Requests do not reserve dates. Confirmation requires an owner-issued quotation, independently verified required down payment and atomic property-wide availability checks.

Read AGENTS.md, PRODUCT.md and .agents/skills/ten29-engineering/SKILL.md in that order. PRODUCT.md is the maintained implementation and approval record; historical docs remain evidence. No production launch is authorized.

## Tech stack

- Next.js (App Router, TypeScript strict, `src/` directory, `@/*` alias)
- Tailwind CSS v4
- Supabase (Postgres, Auth, Row-Level Security) via `@supabase/ssr`
- Resend for transactional email
- Zod for validation
- Vitest + Testing Library (unit/integration), Playwright (e2e)
- Node.js server hosting with maintained media binaries (production host pending owner approval); owner-controlled DNS/HTTPS

See [docs/10_TECHNICAL_ARCHITECTURE.md](docs/10_TECHNICAL_ARCHITECTURE.md) for the full rationale.

## Local setup

```bash
npm ci
cp .env.example .env.local   # fill in real values — never commit this file
npm run dev                  # http://localhost:3000
```

The app is designed to run and build **without** Supabase/Resend configured — public pages work, and admin pages show a clear "not configured" message instead of crashing. Provider clients are constructed lazily inside request handlers, never at module load time.

### Supabase setup

1. Create a Supabase project (owner's account — see [docs/18_DEPLOYMENT_AND_OPERATIONS.md](docs/18_DEPLOYMENT_AND_OPERATIONS.md) for account-ownership rules).
2. Run the migrations in `supabase/migrations/` in order (via the Supabase SQL editor, CLI, or your preferred migration runner).
3. Use disposable CI fixtures for synthetic provider testing — never real guest data.
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
npm run build -- --webpack # verified production build
```

## Tests

- `tests/unit/` — claim-gate enforcement, enquiry validation, status transitions, copy guardrails (no "confirmed booking" language, no Tagaytay-location claims, no fake reviews), site config.
- `tests/integration/` — the inquiry service against an in-memory fake Supabase client (persist-before-notify, notification failure handling, admin queries), the admin-auth decision function.
- `tests/e2e/` — Playwright critical-path coverage; see [docs/16_TEST_STRATEGY.md](docs/16_TEST_STRATEGY.md) for what requires a live Supabase project versus what runs against validation/UI alone.

## The claim-approval system

No business fact (rates, capacity, amenities, policies, positioning copy) reaches a public page unless it is `VERIFIED` or `APPROVED_FOR_PUBLICATION` in `src/content/claims.ts`. Everything else renders honest fallback copy ("rates are being finalized," etc.) instead. This is enforced in code (`isPublicClaim()`/`getPublicClaim()`), not just documentation, and covered by `tests/unit/claims.test.ts`. See [docs/05_OWNER_APPROVAL_MATRIX.md](docs/05_OWNER_APPROVAL_MATRIX.md) and [docs/13_CONTENT_AND_CLAIM_STANDARD.md](docs/13_CONTENT_AND_CLAIM_STANDARD.md).

To approve a value for publication: update its `status`, `approvedBy`, and `approvedAt` in `src/content/claims.ts`, and mirror the change in `docs/05_OWNER_APPROVAL_MATRIX.md` in the same change set.

## Historical upgrade roadmap

Option 1 (this repo) → Option 2 (master calendar, payment tracking, guest ledger) → Option 3 (AI Messenger, payment gateway). Each phase is additive — Option 1's domain, routes, content model, enquiry records, and admin auth are all designed to survive into later phases without a rewrite. Full detail in [docs/19_UPGRADE_ROADMAP.md](docs/19_UPGRADE_ROADMAP.md).

## Account ownership

All production accounts (Cloudflare, Vercel, Supabase, Resend, Google Workspace) belong to TEN29/the owner, never the developer. See [docs/23_OWNER_HANDOVER.md](docs/23_OWNER_HANDOVER.md).

## Operational verification and limits

GitHub Actions starts a disposable localhost Supabase stack, replays migrations 0001-0010, runs pgTAP and actual concurrent PostgreSQL transactions, then provider-backed browser tests. Test accounts and prices are synthetic; no production credentials are needed. Never point provider tests at a linked/hosted project. `supabase/tests/recovery_rehearsal.py` is CI-only, restoring a logical backup into a separate fresh database with no application/API routing; Storage bytes are recovered separately through the Storage API. Backups contain sensitive records and must not be uploaded as CI artifacts.

`/api/health` is public liveness only. OWNER `/admin/operations` provides private configuration and queue/media diagnostics. Existing Requests and Media screens provide controlled retry and cleanup. Notifications pause beyond the deduplication window for manual delivery review. No cron/worker provisioning, real email delivery or physical-device acceptance is implied by automated CI.

Browser-safe variables are `NEXT_PUBLIC_*` site/contact links and Supabase URL/anon key. Service-role and Resend keys, notification destinations, privacy contact and media executable paths are server-only. `.env*` remains ignored; use the existing local `.env.example` reference and never commit populated files. CI validates the provider endpoint is localhost. Production requires HTTPS, owner-held credentials and a separately reviewed environment; do not reuse disposable test accounts.

Node 22, Next 16 server rendering/actions/API routes and writable temporary storage are required. Media processing currently runs in an authorized Node request (up to 240 seconds), requires FFmpeg/ffprobe and libheif tools/plugins, and must be isolated with bounded CPU/memory and OS updates. A static host cannot run this application. A serverless web host alone is not an accepted media-processing deployment. An isolated Node container with these binaries is the smallest current compatible architecture; offloading to a durable worker requires verified integration before choosing that alternative.

Slice 6 physical-device testing, actual-owner UAT, media rights, recurring infrastructure costs, final commercial/privacy policies, recovery objectives and production launch authorization remain pending. See PRODUCT.md for current gates and supervised recovery/release steps. No automated refunds, payment gateway, OTA integration or instant booking is implemented.
