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
