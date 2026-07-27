# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] — 2026-07-27 — Option 1 initial build

### Added

- Full project operating system under `docs/` (charter, vision/mission, product principles, business positioning, owner-approval matrix, digital-presence repair checklist, information architecture, user flows, data model, technical architecture, functional/non-functional requirements, content standard, design system, security & privacy, test strategy, SEO/analytics, deployment/operations, upgrade roadmap, risk register, decision log, definition of done, owner handover, asset requirements, execution log).
- Root `CLAUDE.md` operating rules.
- Public marketing site: home, property, gallery, rates, availability, policies, location, FAQ, book (enquiry), contact, privacy, terms.
- Typed, code-enforced claim-approval registry (`src/content/claims.ts`) gating every business claim before public rendering.
- Booking-enquiry workflow: Zod validation, honeypot + timing anti-spam, persist-before-notify, human-readable reference codes, owner notification email, guest acknowledgement email, Supabase-backed storage with RLS.
- Protected admin dashboard: Supabase Auth login, dashboard counts, inquiry list with filters, CSV export, inquiry detail with status/notes management and an audit trail, owner-preview and claim-registry views.
- SEO: per-route metadata, sitemap, robots, conservative JSON-LD.
- Supabase migrations (`supabase/migrations/`) and a non-production seed script.
- Vitest unit/integration suite and Playwright e2e scaffold.

### Fixed during build (see docs/25_EXECUTION_LOG.md for detail)

- Concurrent `npm install` calls corrupted `package.json`/node_modules — resolved by sequential reinstall.
- `@supabase/supabase-js` 2.110.8 requires `Relationships`/`Views`/`Functions`/`Enums`/`CompositeTypes`/`__InternalSupabase` fields on the typed `Database` interface, or `.from()` queries silently collapse to `never` types.
- Next.js 16 deprecated `middleware.ts`/`middleware()` in favor of `proxy.ts`/`proxy()`.
- `redirect()` called from an async Server Component layout did not reliably stop child rendering in this Next 16 + Turbopack dev setup; admin-route protection was moved to `NextResponse.redirect()` in `src/proxy.ts` as the primary enforcement point.
- A `"use server"` file may only export async functions — plain object/constant exports were moved to sibling `action-state.ts` files.
