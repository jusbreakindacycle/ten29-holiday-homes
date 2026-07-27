# 10 — Technical Architecture

## Required stack (as installed)

- Next.js (App Router, current stable release — see `package.json` for exact version)
- TypeScript with `strict: true`
- Tailwind CSS
- React Server Components by default; Client Components only where interactivity requires (`"use client"`)
- Supabase PostgreSQL for production data
- Supabase Auth for admin authentication
- `@supabase/ssr` for the official Next.js SSR cookie-based session approach
- Supabase SQL migrations stored in `supabase/migrations/`
- Resend for transactional email
- Zod for validation (shared client/server schemas)
- Vercel for production hosting
- Cloudflare Registrar and DNS for the proposed domain
- Google Workspace for the optional business mailbox
- Cloudflare R2 reserved for later media/document storage (not used in Option 1)

Prisma is intentionally not used. Supabase SQL migrations plus generated TypeScript types keep authentication, row-level security, and the hosted Postgres service coherent in one provider, which matters more here than an ORM abstraction Option 1 does not need.

## Application rules

- All application source lives under `src/`.
- Absolute imports use the `@/` alias.
- Mutations go through Next.js Server Actions or Route Handlers — never direct client-side writes to Supabase.
- All form data is validated on the server with Zod, even when a client-side check also exists.
- The inquiry service persists before it notifies (see `src/services/inquiry-service.ts`).
- The Supabase service-role key is only read in server-only modules (never imported by a Client Component, never in `NEXT_PUBLIC_*`).
- Data access goes through a repository/service layer (`src/services/*`) — UI components never import the Supabase client directly.
- Email-provider logic is isolated behind an interface (`src/services/email/*`) so Resend can be swapped later without touching callers.
- Business-content claims live in `src/content/*`, separate from presentation components.
- Public content and admin logic are kept in separate route groups (`src/app/(public)` and `src/app/admin`).
- Canonical URLs are derived from `NEXT_PUBLIC_SITE_URL`, never hard-coded per page.
- Admin session validation happens server-side via Supabase SSR cookies on every protected route/layout.
- Session-cookie refresh **and** the primary admin-auth redirect for `/admin/*` both run in `src/proxy.ts` (exporting `proxy()`, matched by Next.js's `/admin/:path*` matcher). Next.js 16 renamed the `middleware.ts`/`middleware()` convention to `proxy.ts`/`proxy()` — `middleware.ts` is deprecated and triggers a build warning.
- `redirect()` called from `src/app/admin/(protected)/layout.tsx` is a documented second line of defense only. During implementation, calling `redirect("/admin/login")` from that Server Component layout was observed to throw (confirmed via logging) but not reliably short-circuit rendering of the child page in this Next.js 16 + Turbopack dev setup — the child page's own code still executed. `NextResponse.redirect()` at the proxy layer does not have this problem and is the actual enforcement point; treat the layout check as belt-and-suspenders, not the source of truth.
- Row-level security policies gate all Supabase table access; the anon key alone cannot read or write `inquiries` outside the policies defined in migrations.
- Database types are generated/typed by hand in `src/types/database.ts` and kept in sync with migrations.
- Guest personal data is not written to application logs.

## Repository structure

```text
ten29-holiday-homes/
├─ CLAUDE.md
├─ README.md
├─ CHANGELOG.md
├─ CONTRIBUTING.md
├─ .env.example
├─ docs/                     documentation set (this file's siblings)
├─ public/images/{placeholders,ten29}/
├─ src/
│  ├─ app/                   Next.js App Router routes
│  │  ├─ (public)/           public marketing + enquiry routes
│  │  └─ admin/              protected admin routes
│  ├─ components/            shared UI components
│  ├─ content/                typed claim registry + business content
│  ├─ features/               feature-scoped UI (enquiry form, admin table, etc.)
│  ├─ lib/                    supabase clients, env, utilities
│  ├─ services/                service/repository layer (inquiries, email)
│  ├─ types/                   shared TS types incl. database types
│  └─ styles/                  global styles/tokens
├─ supabase/
│  ├─ migrations/              forward-only SQL migrations
│  └─ seed.sql                 optional local seed (no real guest data)
├─ tests/
│  ├─ unit/                    Vitest unit tests
│  ├─ integration/             Vitest integration tests (service layer, mocked Supabase)
│  └─ e2e/                     Playwright critical-path tests
└─ scripts/                    maintenance/setup scripts
```

## Build-without-credentials guarantee

`next build` must succeed even when Supabase/Resend environment variables are unset (e.g. a fresh clone before the owner's Supabase project exists). Server modules that need those clients construct them lazily inside request handlers/server actions, never at module load time, so a missing env var fails a specific request instead of failing the build.
