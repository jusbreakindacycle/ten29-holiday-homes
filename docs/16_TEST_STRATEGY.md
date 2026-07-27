# 16 — Test Strategy

## Tooling

- ESLint (`npm run lint`)
- TypeScript typecheck (`npm run typecheck`)
- Vitest + React Testing Library (`npm run test`)
- Playwright (`npm run test:e2e`)
- Production build verification (`npm run build`)

## Required automated tests

1. Public pages do not render proposed/unverified claims — `tests/unit/claims.test.ts`.
2. Approved claims render correctly — `tests/unit/claims.test.ts`.
3. Enquiry validation rejects invalid dates (check-out ≤ check-in, out-of-range) — `tests/unit/inquiry-schema.test.ts`.
4. Enquiry validation rejects negative/impossible guest counts — `tests/unit/inquiry-schema.test.ts`.
5. Enquiry is stored before email is sent — `tests/integration/inquiry-service.test.ts`.
6. Email failure leaves a stored enquiry with `notification_status = FAILED` — `tests/integration/inquiry-service.test.ts`.
7. Success copy does not say "booking confirmed" or "date reserved" — `tests/unit/copy-guard.test.ts`.
8. Admin routes reject unauthenticated users — `tests/integration/admin-auth.test.ts`.
9. Admin can view inquiries (service-layer query behavior, mocked Supabase) — `tests/integration/admin-inquiries.test.ts`.
10. Admin status updates are validated (illegal transitions rejected) — `tests/unit/inquiry-status.test.ts`.
11. UTM/source values are captured safely (sanitized, length-capped) — `tests/unit/inquiry-schema.test.ts`.
12. Honeypot submissions are rejected/ignored — `tests/unit/inquiry-schema.test.ts`.
13. Canonical metadata resolves from environment configuration — `tests/unit/site-config.test.ts`.
14. No fake review/rating content exists in production fixtures — `tests/unit/copy-guard.test.ts`.

## Manual acceptance checklist

Run before any production launch and recorded in [[25_EXECUTION_LOG]]:

- Android mobile browser
- iPhone-sized viewport
- Desktop
- Keyboard-only navigation
- Screen-reader labels (VoiceOver/NVDA spot check)
- Slow network (Chrome DevTools throttling)
- Email-provider failure (invalid `RESEND_API_KEY`)
- Database failure (invalid Supabase credentials)
- Empty gallery
- No approved rates
- No approved policies
- Long guest message
- Duplicate rapid submission

## Environment limitations

Playwright e2e tests that require a live Supabase project and Resend account cannot run against real infrastructure until the owner provisions those accounts (see [[18_DEPLOYMENT_AND_OPERATIONS]]). The e2e suite is written to run against the local dev server with the persistence and email layers either pointed at a local/disposable Supabase project or exercised through their public UI/validation paths only; any test skipped for this reason is explicitly marked and logged in [[25_EXECUTION_LOG]], never silently passed.
