# 25 — Execution Log

Actual commands run and outcomes, in order. Updated at the end of each phase per the master blueprint's execution rules.

## 2026-07-27 — Phase 0: Workspace and scaffold

- Inspected workspace: empty except `CLAUDE_CODE_MASTER_PROMPT_TEN29_OPTION1.md`. Node v26.1.0, npm 11.14.1.
- `git init` — repository initialized at project root.
- Temporarily moved the blueprint file out of the directory (create-next-app refuses non-empty targets), ran `npx create-next-app@latest .` with TypeScript, Tailwind, ESLint, App Router, `src/` directory, `@/*` import alias, Turbopack, then restored the blueprint file to the root.
- `npm install zod @supabase/supabase-js @supabase/ssr resend clsx` — runtime dependencies added.
- `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test` — test tooling added.
- Result: scaffold in place directly in `ten29-holiday-homes/` root, no nested project directory created.

## 2026-07-27 — Phase 1: Project operating system

- Created `docs/00_PROJECT_CHARTER.md` through `docs/25_EXECUTION_LOG.md` (this file).
- Created root `CLAUDE.md`.
- Seeded `src/content/claims.ts` claim registry mirroring [[05_OWNER_APPROVAL_MATRIX]].

**Lesson learned:** two `npm install` calls were briefly launched concurrently in the same directory (one still finishing in the background when a second was started), which corrupted `package.json`/node_modules (several packages silently dropped, `next` itself went briefly missing). Fixed by re-running all installs sequentially in one command. Do not run concurrent `npm install`/`npm uninstall` in the same project directory.

## 2026-07-27 — Phase 2: Design system and public route shells

- Built the TEN29 color/typography tokens in `src/app/globals.css` (Tailwind v4 `@theme inline`), Cormorant Garamond + Manrope via `next/font/google`.
- Built Header, Footer, MobileMenu, Wordmark (temporary typographic logo), and shared UI components (CtaButton, SectionHeading, Alert, EmptyState, StatusBadge, FaqAccordion, GalleryCard, PlaceholderImage, RateCard, PolicyCard, ContactCard, FormField).
- Built all twelve public routes under `src/app/(public)/`.
- Added `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`.

## 2026-07-27 — Phase 3: Claim-aware content

- `src/content/claim-types.ts` + `src/content/claims.ts`: typed claim registry with `isPublicClaim`/`getPublicClaim`/`getPublicClaimOrFallback`/`getOwnerPreviewClaims`/`getAllClaims`, mirroring [[05_OWNER_APPROVAL_MATRIX]].
- `src/content/fallback-copy.ts` for transparent pending-state copy.
- `tests/unit/claims.test.ts`, `tests/unit/copy-guard.test.ts`, `tests/unit/site-config.test.ts` — all passing.

## 2026-07-27 — Phase 4: Supabase and service layer

- `supabase/migrations/0001_init.sql` (schema) and `0002_rls.sql` (row-level security — anon has no direct table access; public inserts go through the service-role key from server-only code).
- `src/types/database.ts` hand-typed to match the migrations.
- **Typing gotcha:** the installed `@supabase/supabase-js` (2.110.8) requires each table entry to include a `Relationships` field and the `Database` type to include `Views`/`Functions`/`Enums`/`CompositeTypes` and (ideally) `__InternalSupabase.PostgrestVersion` — omitting any of these silently collapses `.from(table).insert(...)` etc. to `never` types with no build-time hint beyond confusing "Object literal may only specify known properties... type 'never[]'" errors. Fixed in `src/types/database.ts`.
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/get-admin-user.ts`, `src/services/inquiry-service.ts`, `src/services/email/*`.
- `tests/integration/inquiry-service.test.ts` (fake in-memory Supabase client), `tests/integration/admin-auth.test.ts` — all passing.

## 2026-07-27 — Phase 5: Enquiry workflow

- `src/lib/validation/inquiry-schema.ts` (Zod), `src/lib/reference-code.ts`, `src/app/(public)/book/actions.ts` + `action-state.ts`, `src/components/features/enquiry/EnquiryForm.tsx` (React 19 `useActionState`).
- **Bug found and fixed:** a `"use server"` file may only export async functions — `actions.ts` originally also exported a plain object constant (`initialEnquiryState`) alongside the action, which Next.js rejects at runtime ("A 'use server' file can only export async functions, found object"). Moved constants/types into sibling `action-state.ts` files (no `"use server"`), imported separately. Same fix applied to the admin actions file.
- **Lint fix:** the hidden `form_rendered_at` anti-bot timestamp field was originally set via `useState` + `useEffect`, which `eslint-config-next`'s `react-hooks/set-state-in-effect` rule flags as an error. Replaced with an imperative `ref` callback that sets `input.value` directly on mount (client-only, no state, no hydration mismatch).
- `tests/unit/inquiry-schema.test.ts` — all passing.

## 2026-07-27 — Phase 6: Admin routes

- `src/app/admin/login/page.tsx` (Supabase Auth password sign-in), `src/app/admin/(protected)/layout.tsx`, dashboard, inquiries list + CSV export route handler, inquiry detail with status/notes forms, owner-preview, claim registry.
- **Next.js 16 breaking change found:** the `middleware.ts` file convention is deprecated in favor of `proxy.ts` exporting `proxy()` (same signature/matcher config). Renamed accordingly; `middleware.ts` deleted.
- **Bug found and fixed (significant):** `redirect("/admin/login")` called from `src/app/admin/(protected)/layout.tsx` (an async Server Component layout) was confirmed via logging to execute and throw, but did **not** reliably stop the child page from rendering in this Next.js 16 + Turbopack dev environment — the child page's own code still ran afterward. Moved the primary auth redirect into `src/proxy.ts` using `NextResponse.redirect()`, which was verified working (`307` to `/admin/login`, confirmed with curl against a temporary local `.env.local` — removed afterward, never committed). The layout's `redirect()` call is kept only as a documented, non-authoritative second check. See [[10_TECHNICAL_ARCHITECTURE]].
- Verified locally: unauthenticated `/admin/*` requests 307-redirect to `/admin/login` when Supabase env vars are present; when Supabase is entirely unconfigured (fresh clone), admin pages degrade gracefully to a "Confirm Supabase is configured" message instead of crashing.

## 2026-07-27 — Phase 7: Environment docs and accessibility pass

- `.env.example`, `README.md` (replaced create-next-app default), `CHANGELOG.md`, `CONTRIBUTING.md`.
- Added a "Skip to main content" link to the public layout (was missing).

## 2026-07-27 — Phase 8: Quality gates

Commands run, in order, on a clean tree:

```
npm run lint        → 0 problems
npm run typecheck    → 0 errors
npm run test          → 7 files, 70 tests passed
npm run build          → succeeds with no Supabase/Resend env vars set
npm run test:e2e       → 8 tests passed (Playwright, chromium, serial)
```

- Confirmed via `grep -rl SUPABASE_SERVICE_ROLE_KEY .next/static` and `grep -rl createSupabaseServiceRoleClient .next/static` — no matches, i.e. the service-role key and the module that reads it never reach the client bundle.
- **Next.js 16 dev-mode config found needed:** `allowedDevOrigins` — Next 16 blocks cross-origin dev-mode requests (HMR) by default, which manifested as flaky/hanging navigation in Playwright against `127.0.0.1`. Added `allowedDevOrigins: ["127.0.0.1", "localhost"]` to `next.config.ts`.
- Playwright config set to serial (`workers: 1`) with longer navigation/expect timeouts — against a Turbopack **dev** server (not a production build), first-hit-per-route compile latency under parallel workers produced flaky timeouts unrelated to application correctness (independently verified the affected routes returned `200` via `curl`).
- e2e coverage that would require a live Supabase project (real sign-in, real enquiry persistence, real admin CRUD) is not runnable in this environment and is not faked — see [[16_TEST_STRATEGY]]. What Playwright does verify without those credentials: full public navigation, the enquiry form's client-side required fields, that a real form submission never claims a confirmed booking even when it fails, the custom 404 page, and that the admin login page has no self-registration path.
- Manual acceptance checklist (mobile viewport, screen reader, slow network, etc. from [[16_TEST_STRATEGY]]) has not been run — flagged as an owner-facing next step, not silently skipped.

Definition of done ([[22_DEFINITION_OF_DONE]]) re-checked against this state: items 1–13 and 15 satisfied; item 14 (final owner asset/approval gaps) is documented in [[24_ASSET_REQUIREMENTS]] and [[05_OWNER_APPROVAL_MATRIX]] and remains open pending owner action, as expected at this stage.

## 2026-07-28 — Phase 9: Local-environment, E2E, and dependency-security remediation

Baseline confirmed before any change: `git status` showed only a generated `test-results/.last-run.json` artifact modified (not source); `git rev-parse HEAD` and `git rev-parse origin/main` both resolved to `18c7d3817d39f4c1f145def4747688f9046d5596` — local tree matched the latest pushed baseline exactly.

**Slow-filesystem / drive confirmation.** `D:` is Disk 1, physical device **TOSHIBA MQ04ABF100** (`Get-PhysicalDisk`), a spinning 5400 RPM 2.5" hard disk drive — not an SSD. This confirms Next.js's own slow-filesystem benchmark warning; it is the physical root cause of everything below. The project stays on `D:` — no relocation was made or suggested.

**Original Playwright timeout — root cause.** `playwright.config.ts` pointed its `webServer` at `npm run dev -- --port 3100` (Turbopack **dev** server) with a 120 000 ms startup timeout. Under `next dev` the first request to each route pays a real, on-demand compile cost; on the Toshiba HDD, that per-route compile latency (compounded by general filesystem I/O being the slowest link, as also seen in the 258 s Vitest "environment" phase in this same run) pushed dev-server readiness past 120 s, so Playwright timed out waiting for a server that was still compiling rather than one that had failed to start.

**Durable fix applied** (`playwright.config.ts`, `playwright.dev.config.ts`, `package.json`):
- `test:e2e` is now `next build && playwright test` — the build's one-time compile cost is paid up front, before Playwright ever starts a server.
- `playwright.config.ts`'s `webServer.command` is now `npm run start` (`next start`, a production server) instead of `next dev`.
- `webServer.url` / `use.baseURL` now default to the explicit `http://127.0.0.1:3000` (overridable via `PLAYWRIGHT_BASE_URL`).
- `webServer.timeout` raised to `300000` ms (still generous headroom, though the production server now boots in ~2 s).
- `webServer.reuseExistingServer` kept as `!process.env.CI` (unchanged behavior outside CI).
- `webServer.stdout` / `webServer.stderr` set to `"pipe"` so startup problems remain visible instead of being swallowed.
- Verified: on this run, `next start` reported `✓ Ready in 1990ms`, and all 8 Playwright tests passed in ~1.1 minutes total — no timeout, no flakiness.
- A separate dev-server E2E path was preserved as `npm run test:e2e:dev`, loading the new `playwright.dev.config.ts` (targets `next dev` on port 3100, single-worker/serial, 120 s startup timeout) — kept because it has real value for iterating on a page without paying for a full rebuild each time; it is not the default gate and is not suitable as one on this disk.
- CI is unaffected: no `.github/workflows` (or other CI config) exists in this repository yet, so nothing was duplicated or broken there; `process.env.CI` branches (`forbidOnly`, `retries`, `reuseExistingServer`) were left exactly as before.

**Dependency-security findings (`npm audit`, 12 high, 0 critical/moderate/low, before any change):**

| Finding | Direct/Transitive | Prod/Dev | Classification |
|---|---|---|---|
| `postcss` (nested copy bundled inside `next@16.2.12`, resolved 8.4.31) — GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | Transitive (of `next`) | Present in both prod and dev audits | **Safely fixable without a breaking update** — same-major (8.x) patch |
| `sharp` (0.34.5, `next`'s optional dep for `next/image` optimization; used in production via `src/components/ui/GalleryCard.tsx`) — GHSA-f88m-g3jw-g9cj (libvips CVE-2026-33327/33328/35590/35591) | Transitive (of `next`) | **Production** | **No fix currently available without a breaking update.** Patched only from `sharp@0.35.0`; `sharp` has no `0.34.x` patch release that fixes it. `next@16.2.12` pins `optionalDependencies.sharp` to `^0.34.5`, i.e. it explicitly excludes `0.35.x`. Forcing `0.35.x` via override would mean running a sharp version Next has not tested against this Next release, and under 0.x semver a `0.34→0.35` bump is a breaking-equivalent change — this is exactly the kind of silent major-equivalent jump the remediation instructions said not to make. Left unfixed and documented; the real fix is an upstream Next.js release that bumps its own `sharp` pin. |
| `next` (flagged only because it depends on the above `postcss`/`sharp`) | Direct | Both | Resolves itself once `postcss`/`sharp` are addressed; no separate action needed |
| `eslint`, `eslint-config-next` | Direct | **Dev only** | Requires a breaking update (`eslint` 9→10) with no `eslint-config-next` release yet compatible with `next@16.2.12` that drops the vulnerable chain (npm's suggested "fix," `eslint-config-next@0.2.4`, is a pre-1.0 release from years before Next 16 and is not a real fix path) |
| `@eslint/config-array`, `@eslint/eslintrc`, `minimatch`, `brace-expansion`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react` | Transitive (of `eslint`/`eslint-config-next`) | **Dev only** | Same as above — all resolve once `eslint`/`eslint-config-next` get a compatible major update |

Not reachable in TEN29's actual runtime, with justification: the entire `eslint`/`minimatch`/`brace-expansion` chain (9 of the 12 findings) is lint tooling only — it never ships in `next build` output, is not loaded by any served route, and its DoS vector (`brace-expansion` unbounded-expansion) is only reachable by feeding attacker-controlled glob patterns to the linter's own file-matching, which nothing in this app's request path does.

**Dependency changed:** added a targeted `"overrides": { "postcss": "8.5.23" }` to `package.json`, deduping the vulnerable nested `next/node_modules/postcss@8.4.31` onto the same patched `8.5.23` already used at the top level (by `@tailwindcss/postcss` / Vite) — same major version, no application code affected, confirmed via `npm ls postcss` (all three consumers now resolve to `8.5.23`, one `overridden`, two `deduped`). `package-lock.json` regenerated to match (required deleting and reinstalling — incremental `npm install`, even with `--force`, did not pick up the new override against already-installed `node_modules`). No other dependency versions were changed; `npm audit fix` / `npm audit fix --force` were not run.

**`npm outdated`** additionally showed non-security patch versions available for `@supabase/supabase-js` (2.110.8→2.110.9), `react`/`react-dom` (19.2.4→19.2.8), `eslint` (9.39.5→10.8.0, major), `typescript` (5.9.3→7.0.2, major), and `@types/node` (20.19.43→26.1.1, major). None of these are tied to a security finding; left unchanged to keep this change set targeted to the audit remediation and the E2E fix, per instructions not to make changes beyond what's needed.

**Final vulnerability counts:**
- `npm audit` (all): **11 high** (down from 12) — 9 dev-only (eslint/minimatch chain, documented above) + `next`/`sharp` (production, documented above).
- `npm audit --omit=dev`: **2 high** (down from 3) — `next` and `sharp` only; `postcss` no longer appears in either audit.
- **A production-relevant vulnerability (`sharp`/libvips) remains open**, with no safe fix available today — see table above.

**Final quality-gate results (this run, in order):**
```
npm run lint         → 0 problems
npm run typecheck    → 0 errors
npm run test         → 7 files, 70 tests passed (65.68s; setup/environment phases dominated by disk I/O)
npm run test:e2e     → next build succeeded, next start ready in 1990ms, 8/8 Playwright tests passed (~1.1 min total)
npm run build        → succeeds (standalone re-run, same as before)
npm audit            → 11 high (see above)
npm audit --omit=dev → 2 high (see above)
```

No business content, public claims, architecture scope, owner-approval values, routes, or Option 1 functionality were touched. Changes were not committed or pushed, per instructions.

## 2026-07-28 — Phase 10: Project Steward decision reconciliation

Reconciled the 11 Project Steward decision groups from `docs/26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION.md` into the structured claim and owner-preview system. Production launch remains unauthorized; no claim was moved to `APPROVED_FOR_PUBLICATION`; no factual property data was invented.

- `src/content/claim-types.ts`: added `STEWARD_APPROVED_FOR_PROTOTYPE` to `ClaimStatus`, plus `ownerVerificationRequired`, `affectedRoutes`, and `previewSection` optional fields on `Claim`. Added `isStewardApprovedForPrototype()` and `getApprovalStateLabel()` helpers. `PUBLIC_STATUSES` (the public-claim gate) left unchanged — the new status is not public by construction.
- `src/content/claims.ts`: moved the 34 claims covering the 11 decision groups (positioning/audience CLM-POS-001/002/003/004/005, capacity CLM-CAP-001..006, rates CLM-RATE-001..008, promotions CLM-PROMO-001..004, hours CLM-HOURS-001..004, payment CLM-PAY-001..003, cancellation CLM-CXL-001..003, house rules CLM-RULE-001) from `PROPOSED_PENDING_APPROVAL` to `STEWARD_APPROVED_FOR_PROTOTYPE`, each with `ownerVerificationRequired: true`, `affectedRoutes`, `previewSection`, and a `source` reference to docs/26. Applied the CLM-POS-001b audience broadening ("small families, groups of friends (barkada), and similar small groups") to CLM-POS-001 and CLM-POS-005 values. `CLM-BIZ-005`/`CLM-BIZ-006` (domain/email) and all `CLM-FACT-*` blank facts were left untouched — not part of the 11 decision groups.
- `src/content/owner-preview-assets.ts` (new): static asset/account checklist mirroring docs/26 §5, rendered on the owner-preview page's "Assets still required" section — not a claim, since it carries no business-value or factual-property information.
- `src/app/admin/(protected)/owner-preview/page.tsx`: rebuilt to group claims by `previewSection` (Brand and positioning, Audience and location, Capacity, Rates and promotions, Operating hours, Payment process, Cancellation and rescheduling, House rules, Facts still requiring verification, Assets still required), showing proposed value, human-readable approval state, whether owner confirmation is still required, and affected routes per item. Still gated by `isOwnerPreviewEnabled()` and the existing authenticated `(protected)` layout; not linked from any public route, sitemap, or robots file (already excluded there).
- `docs/05_OWNER_APPROVAL_MATRIX.md`, `docs/13_CONTENT_AND_CLAIM_STANDARD.md`, `docs/21_DECISION_LOG.md`: updated to define and cross-reference the new status and mirror the 34 claim status changes, per the code-is-authoritative rule in docs/05.
- Tests: `tests/unit/claims.test.ts` extended with `STEWARD_APPROVED_FOR_PROTOTYPE`-specific gate assertions; `tests/unit/copy-guard.test.ts` and `tests/unit/site-config.test.ts` unaffected (re-run, still passing). No Playwright changes — no existing or newly written E2E test targets the authenticated owner-preview route specifically, so `test:e2e` was not run for this phase (per instructions, run only when it directly covers the change).

## 2026-07-28 — Phase 11: Owner-supplied property description reconciliation

Reconciled the actual owner-supplied TEN29 property and promotional description (received through
the Project Steward on 2026-07-28) into the claim registry, protected owner preview, public
routes, and controlling documentation. No new owner questionnaire was created; no Facebook,
Google Maps, phone, or location information was re-requested; the Option 1 enquiry-not-booking
scope was preserved unchanged.

- `src/content/claim-types.ts`: added a `location` claim category.
- `src/content/claims.ts`: added `OWNER_FACT_SOURCE` evidence-label constant. Added new
  `APPROVED_FOR_PUBLICATION` claims CLM-FACT-030 (accommodation model), CLM-FACT-031 (stay
  duration options), CLM-FACT-032 (parking availability, no capacity), CLM-FACT-033 (CCTV
  presence, no locations), CLM-FACT-034 (property areas/features), and CLM-LOC-001..004
  (surroundings and qualified travel-time wording). Moved CLM-FACT-001/002/003 (bedrooms/beds/
  bathrooms), CLM-FACT-006/007/008/009 (Wi-Fi, aircon, kitchen, TV/entertainment), CLM-FACT-013
  (relabeled "Guest amenities and toiletries"), and CLM-FACT-016/017 (fire extinguisher, smoke
  alarm) from `UNVERIFIED`/blank to `APPROVED_FOR_PUBLICATION`. CLM-FACT-004/005/010/011/012/014/
  015/018/019/020/021..029 remain `UNVERIFIED` — genuinely not covered by the supplied description.
  No claim was moved to `APPROVED_FOR_PUBLICATION` without `approvedAt` recorded, and no rate,
  capacity, payment, cancellation, or house-rule claim was touched.
- `src/app/(public)/property/page.tsx`: rebuilt to render the newly approved amenity facts and the
  accommodation-model explanation via the claim gate, keeping an explicit pending-facts table for
  maximum occupancy and parking capacity.
- `src/app/(public)/page.tsx`: homepage's "Private whole-property use" highlight now renders the
  claim-gated accommodation-model sentence (with the exact fallback sentence from the task brief
  as a non-public fallback).
- `src/app/(public)/rates/page.tsx`, `src/content/fallback-copy.ts`: rates fallback copy replaced
  with the task-specified sentence describing bedroom-access stays and verified quotations; rates
  page also surfaces the stay-duration-options claim and its CTA now reads "Get a Verified
  Quotation".
- `src/app/(public)/location/page.tsx`: renders the owner-approved surroundings statement and the
  two qualified travel-time claims (Tagaytay, Governor's Drive CALAX access) when public.
- `src/app/(public)/policies/page.tsx`: adds a "Safety on the property" block for the now-public
  CCTV-presence, fire-extinguisher, and smoke-alarm facts; house rules/cancellation remain pending
  (unchanged, still steward-approved-only).
- `src/app/(public)/gallery/page.tsx`: placeholder captions made specific (per-bedroom, private
  lanai) to describe the exact original assets still required — no images fabricated or generated.
- `src/content/faq.ts`: added a FAQ item stating TEN29 is a whole-house stay with bedroom-access
  options, explicitly not individually rented rooms.
- `src/app/admin/(protected)/owner-preview/page.tsx`: added an "Owner-confirmed facts already live
  on the public site" section (split into "published as supplied" and "published with restricted
  wording"), referencing docs/27, ahead of the existing steward-approved-proposal sections.
- `docs/27_TEN29_OWNER_FACTUAL_CONFIRMATION.md`: added a §0 confirmation-received summary and
  filled in the property-identity and property-facts tables for every item the owner answered,
  using the required classification vocabulary; genuinely unanswered rows (occupancy, parking
  capacity, permits, Instagram, active emails) were left open. Facebook Page and Google Maps
  listing existence recorded as confirmed; their final URLs remain unresolved and no existing URL
  was invented.
- `docs/05_OWNER_APPROVAL_MATRIX.md`, `docs/13_CONTENT_AND_CLAIM_STANDARD.md`,
  `docs/21_DECISION_LOG.md`, `docs/24_ASSET_REQUIREMENTS.md`: updated to mirror the claim changes,
  the new fallback/prohibited-copy wording, the dated decision, and the resolved-vs-open asset
  list.
- Tests: see `tests/unit/claims.test.ts`, `tests/unit/copy-guard.test.ts`, and
  `tests/unit/property-facts.test.ts` (new) for the specific assertions added — public rendering
  of the approved facts, the whole-house/bedroom-access model, absence of prices/capacity/banned
  phrases, and continued owner-preview protection.
