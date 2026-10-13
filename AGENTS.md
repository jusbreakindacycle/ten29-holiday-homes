# TEN29 Holiday Homes — Agent Operating Contract

> Version: 1.0-draft | Prepared 2026-10-11 | Proposed for merging into the existing repository. This file does not authorize a production launch or substitute for approval by the actual TEN29 owner.

## 0. Read order and authority

Read (1) this `AGENTS.md`, (2) `PRODUCT.md`, (3) `.agents/skills/ten29-engineering/SKILL.md`, then inspect the live repository and its migrations, tests, and deployment configuration. **Never assume documents accurately describe code without inspecting it.** Prior original owner-approved property facts and all signed/written owner evidence outrank estimates and proposals. `PRODUCT.md` records implementation decisions; project ownership, legal requirements and production approval always remain with the actual TEN29 owner.

When two sources disagree: stop only the affected high-risk operation, expose the difference, explain the safe default, and continue unrelated verified work. No inventing business facts, approved prices, booking/deposit rules, property capacity, permits, guest reviews, payment receipts, ownership permissions, or deployment success. Never equate the Project Steward's implementation approval with publication authorization by the unit owner.

## 1. Repository is not a blank slate

- Preserve the existing Next.js App Router + TypeScript strict + Tailwind CSS v4 application, Supabase PostgreSQL/Auth/SSR foundation, Zod validation, Resend abstraction, existing `inquiries` and `inquiry_audit_events`, public routes, owner preview, tests, and claim/publication gates.
- Work from the inspected `main` head and make changes in bounded, reviewable increments. The last observed head during this document's preparation is `c1fa8360fa5ea4cc6fd9a18c15566cf87b562200` (2026-07-29); revalidate on each session.
- Repo-specific Next.js instructions matter: read `node_modules/next/dist/docs/` for the **installed** version before modifying framework-sensitive conventions. Follow supported Next.js 16 patterns; do not introduce deprecated middleware conventions or assume APIs from earlier versions.
- Keep `CLAUDE.md` as the existing tiny pointer to `AGENTS.md`; don't maintain a duplicate manual there.
- Historic `docs/00...27` files contain evidence and historical owner decisions: **archive them, don't discard them merely to meet the three-file planning preference**. Three *maintained instruction documents* means this file, `PRODUCT.md`, and the engineering `SKILL.md`. It does not mean eliminating source files, SQL migrations, tests, README, CHANGELOG, `.env.example`, or historical evidence.

## 2. Product invariants (non-negotiable)

1. TEN29 is one physical private holiday home, Biclatan, General Trias, Cavite. Guest selects one of three bedroom-access packages: **1-bedroom, 2-bedroom, or 3-bedroom**. Every confirmed reservation occupies the **entire property**. Never sell overlapping packages for the same property/dates.
2. A calendar date selection is a **request**, not a booking. Enquiry submitted/quoted/awaiting-deposit is not `CONFIRMED`. Guest cannot confirm a booking or submit an arbitrary paid flag.
3. Only an **authorized owner/staff member** can verify down payment against actual receipt and transition a request into a confirmed reservation. This must be enforced server-side and in a single atomic database transaction that checks the property-wide availability constraint. Receipt screenshot alone is not verified money.
4. Both confirmed reservations and manually blocked owner/unavailable dates prevent new confirmations. Pending requests are not automatically confirmed and do not imply exclusive occupancy. If an owner-approved time-limited hold is used, it must be explicitly labeled provisional and have reliable expiry and conflict handling.
5. Rates are **per package** and configurable by the owner. Standard/day-of-week rates, owner-declared holiday categories and date overrides are data-driven; they are not historical prototype values masquerading as approved rates. Show a price **estimate** only when the relevant rates and charges are approved/published. Preserve immutable quote snapshots and audit edits.
6. The actual owner controls mobile-friendly photos and videos uploaded using Android/iOS file pickers. Validate type/size/signatures, enforce permissions, quarantine pending processing, strip sensitive location metadata, provide accessible descriptions, and publish only supported, owner-approved assets. iPhone HEIC/MOV usability must be tested; never pretend an unsupported codec worked.
7. Preserve public-claim approval gating. Operational price editing requires explicit draft/publish workflow and separate approval state for public claims. An admin edit is not automatically a historical claim approval.
8. Protect guest personal information and administrative data. Separate `authenticated` from `authorized for TEN29` in server actions, route handlers **and database RLS**. Do not rely on a proxy/layout as sole permission enforcement. Service-role keys never go to the browser. No public user sign-up for admin.
9. All external channels (Messenger, phone, walk-in, OTA if manually reported, etc.) may create owner-entered requests/bookings. Manual direct-booking confirmations obey the same deposit-verification and non-overlap rules. Do not claim real-time Facebook/OTA integration.
10. Avoid unapproved payment automation, card collection, auto-charge, fake calendar availability, false payment promises or unsupported security claims.

## 3. Engineering standards

- Prefer existing routes/components/services and forward-only SQL migrations. Design schema, RLS, constraints and service layer before UI controls that mutate money or bookings. Check potential collisions under concurrency in the **database**, not only in JavaScript.
- Choose least-privilege access: public readers get only published media/rates/coarse availability; owner and authorized staff get role-scoped write privileges. Raw payment identifiers, guest PII, and internal financial evidence remain private.
- Use Zod and server-side validations for all inputs. Use explicit time-zone rules: business dates in `Asia/Manila`, nightly spans `[check_in, check_out)` (checkout is exclusive). Never compute multi-night fees using UTC time differences across local calendar boundaries.
- Quote engine computes on the server from published package/rate data and returns authoritative totals and line items. Never trust browser price/package/status submissions. Store minor currency units or PostgreSQL NUMERIC (not float arithmetic); PHP currency, precise rounding.
- File uploads use authenticated short-lived storage upload authorization or server-side upload routes, private staging where needed, MIME + magic-byte validation, file-size/total quotas, rate limits, safe naming, image/video conversion as actually supported, and publish gating. Review hosting and storage costs. Prefer resumable uploads for large video files.
- Every state transition, rate publication, deposit verification, booking modification, cancellation, date block, and media publication must be auditable without leaking secrets or payment-account details into logs.
- Prevent cross-site scripting through sanitized copy, safe media URLs and no arbitrary HTML injection. Apply CSRF/session checks where applicable; protect against mass assignment, IDOR, spam, replay, malicious file upload, duplicate submissions, broken access control and stale-price races.
- Keep existing `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` usable. If actual invocation cannot be run, state **not run**, never imply passing. Add unit/integration/E2E tests for new critical paths.
- Design mobile-first, touch-friendly and keyboard/screen-reader-usable. Preserve TEN29's restrained visual identity rather than importing a generic hotel-template dashboard.
- Production operations require owner-controlled accounts and verified domain/deployment suitability. Static Tiiny Host presentations are not proof that authenticated Next.js and Supabase server functionality work in production.

## 4. Autonomy, constraints and release gates

- Default: plan and implement small verified slices once implementation is explicitly authorized. For dangerous or irreversible actions (production database destructive migrations, removing data, exposing unapproved rates, production launch, payment-account changes, sending real customer messages or committing financial/owner approval), pause those actions and obtain the specific owner's authorization. Continue safe local work.
- Do not create new scattered planning docs, duplicate master prompts, separate ADR files, or repetitive task checklists. Update `PRODUCT.md`'s decision log, traceability table and risk register instead. Keep necessary code comments and migration documentation.
- Never delete/alter old migrations already applied in production; write numbered additive migrations. Verify deployed database state before migrations.
- Read `.env.example` not actual `.env` secrets; never print secrets. Handle errors without exposing guest PII. Configure and verify backups/restore test, observability, environment separation and rollback prior to production launch.
- Prefer iterative delivery in this order: baseline audit and authorization fix → data model/calendar conflicts → guest selection → owner request/hold/deposit workflow → pricing editor and approved display → photo/video upload & publication → integrated E2E hardening → owner UAT/handover.

## 5. Response contract for every coding task

Be succinct, but report: (1) inspected baseline, (2) assumptions/open business approvals, (3) chosen slice and affected files, (4) changes made, (5) test names/actual results, (6) red-team findings and mitigations, (7) remaining risks/next safe slice. Never report a feature as working solely because code was generated. Evidence is required.

Do not change the repository merely because this document exists; wait for a concrete authorized implementation task.
