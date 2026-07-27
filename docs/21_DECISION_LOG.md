# 21 — Decision Log

| Date | Decision |
|---|---|
| 2026-07-27 | New maintainable website required because old website is unavailable and original IT support is gone. |
| 2026-07-27 | Proposed domain is `ten29holidayhomes.com`, pending availability and owner purchase. |
| 2026-07-27 | Start with Option 1 at PHP 35,000. |
| 2026-07-27 | Build Option 1 with an upgrade-ready architecture. |
| 2026-07-27 | Option 2 is a later additive upgrade, not a replacement. |
| 2026-07-27 | Option 3 is a later AI/payment upgrade. |
| 2026-07-27 | Owner approval is required before proposed business values become public. |
| 2026-07-27 | Website bookings are enquiries only in Option 1. |
| 2026-07-27 | Facebook integration in Option 1 is a link/manual continuation, not an API integration. |
| 2026-07-27 | General Trias is the primary location identity; Tagaytay is secondary route positioning only. |
| 2026-07-27 | No copied attraction imagery. |
| 2026-07-27 | Stack decision: Next.js App Router + TypeScript strict + Tailwind + Supabase (Postgres/Auth/SSR) + Resend + Zod, no Prisma, hosted on Vercel. |
| 2026-07-27 | Repository initialized directly in the existing `ten29-holiday-homes` root; no nested project folder created. |
| 2026-07-27 | Claim-gate rule implemented in code (`src/content/claims.ts`), not documentation alone, and covered by automated tests. |
| 2026-07-28 | Project Steward approved 11 decision groups (positioning/audience, location, capacity, rates, promotions, hours, payment, cancellation, house rules) for prototype and authenticated owner preview — see [[26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION]]. |
| 2026-07-28 | New claim status `STEWARD_APPROVED_FOR_PROTOTYPE` added: approved for implementation and owner preview, explicitly not approved for public publication, and still requires actual TEN29 owner confirmation. |
| 2026-07-28 | The 11 steward-approved decision groups reconciled into `src/content/claims.ts` and [[05_OWNER_APPROVAL_MATRIX]] with this status; no production launch authorized and no claim moved to `APPROVED_FOR_PUBLICATION`. |
