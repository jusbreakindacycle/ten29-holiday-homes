# 12 — Non-Functional Requirements

## Accessibility

- WCAG 2.2 AA-oriented implementation.
- Keyboard-operable navigation and forms; no interactive element reachable only by mouse/touch.
- Visible focus states on every focusable element (no `outline: none` without a replacement).
- Sufficient color contrast for text and interactive elements against the ivory/forest palette.
- Semantic heading hierarchy (`h1` once per page, no skipped levels).
- Proper `<label>`/`aria-describedby` associations and inline error messages.
- Reduced-motion support via `prefers-reduced-motion`.
- No information communicated by color alone (status badges pair color with text/icon).

## Performance

- Mobile-first layout and CSS.
- Local images served via `next/image` with responsive sizes; no unoptimized remote imagery.
- Client-side JavaScript kept minimal — Server Components by default, `"use client"` only for forms/menus/interactive widgets.
- No autoplay video.
- Target: strong Lighthouse performance without sacrificing honesty or accessibility. Actual measured scores are recorded in [[25_EXECUTION_LOG]] rather than assumed.

## Reliability

- A stored inquiry survives an email-provider failure (persist-before-notify, see [[10_TECHNICAL_ARCHITECTURE]]).
- Server-side duplicate-submission guard reduces (does not claim to eliminate) accidental double inserts.
- Database/email errors are caught and surfaced as friendly UI states, never a raw stack trace to the guest.
- No silent failures: every notification attempt writes an audit event.
- Server logs avoid unnecessary personal data (no full guest message bodies in logs; reference codes and status only).
- A `/api/health` diagnostic route exists for operational checks and is not linked from public navigation.

## Maintainability

- TypeScript `strict: true` throughout.
- Small, focused modules; one responsibility per service file.
- Business constants (rates, capacity, policy text) defined once in `src/content/claims.ts`, never duplicated inline in components.
- No hard-coded secrets — all provider credentials come from environment variables documented in `.env.example`.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all runnable from a clean checkout.
- Upgrade boundaries documented in [[19_UPGRADE_ROADMAP]].

## Security

- Server-side validation for every mutation (Zod schemas re-validated on the server regardless of client validation).
- React's default escaping is relied on for output rendering; no `dangerouslySetInnerHTML` with unsanitized input.
- Admin access requires an authenticated Supabase session validated on the server for every protected route.
- Row-level security policies on every Supabase table that stores guest or admin data.
- Principle of least privilege: the anon key can only do what RLS policies explicitly allow; the service-role key is never shipped to the browser.
- Secure headers configured in `next.config.ts` (e.g. `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- No service key present in any client bundle — verified as part of the build quality gate.
- No guest data used in statically generated pages/build-time data.
- Rate-limiting strategy documented in [[15_SECURITY_AND_PRIVACY]] (Option 1 uses a lightweight timing/honeypot check; a provider-level rate limiter such as Cloudflare or Vercel Firewall is recommended before high-traffic production launch).
- Admin status/note changes write an audit event with actor, previous value, and new value.
