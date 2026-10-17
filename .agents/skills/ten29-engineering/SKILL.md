---
name: ten29-engineering
# The skill file is intended for .agents/skills/ten29-engineering/SKILL.md.
description: Safely upgrade and maintain TEN29 Holiday Homes' existing Next.js enquiry website as an owner-managed booking, pricing, and media platform. Use for inspection, planning, implementation, testing, red teaming, deployment review, and handover.
---

# TEN29 Engineering Loop

**Primary operating context:** `AGENTS.md` and `PRODUCT.md`. The skill is a repeatable *procedure*, not a second source of product truth. Do not add more Markdown plans. Read old `docs/` files only when validating historical evidence/decisions.

## Invocation/task modes

- **AUDIT:** inspect current repo, versioned migrations, auth/RLS, tests, deployment; report code vs document discrepancies and risk-ranked blockers. Make no edits unless separately instructed.
- **DESIGN:** challenge scope, write a minimal vertical-slice plan and acceptance tests; adjust `PRODUCT.md` decisions only when supported; distinguish proposals from owner approvals.
- **BUILD:** implement a selected approved slice; preserve the current app, write migrations and tests, run checks; never publish unapproved facts/rates.
- **FIX:** reproduce, isolate root cause, add regression test, repair, re-run relevant checks.
- **REVIEW/RED TEAM:** inspect the security, availability, pricing, date, uploads, privacy, accessibility, operations and cost surfaces; give severity, reproduction, mitigation.
- **RELEASE:** require verified owner consent, verified account ownership, migrations, backups/restore, tests, monitoring, actual working infrastructure and UAT. No guesses.

## Loop: inspect → challenge → specify → implement → test → attack → revise

### 1. Inspect and gather evidence

Check `git status`, current branch/HEAD, package versions, route tree, relevant services, SQL migrations, database types, RLS, existing tests and environment strategy. Start from actual implementation rather than a previous agent's summary. Document meaningful discrepancies in `PRODUCT.md` §Baseline/Decisions, not a new report file. Don't overwrite uncommitted edits.

### 2. Challenge the request and its hidden assumptions

- Is this actually needed for the owner's stated MVP, or is it hotel/PMS complexity creep?
- Does it preserve the whole-property-exclusive 1/2/3-bedroom package model?
- Does it confuse enquiry, provisional hold, down-payment pending, money received, money verified, or booking confirmed?
- Can it cause conflicting reservation dates from two browser tabs, multiple administrators or external manual entries?
- Is its public price supported by owner-approved published data? Is a discount stacking rule approved?
- Does the owner truly need raw video hosting; can device-upload/transcode be supported affordably and safely?
- Does the present deployment support server rendering, auth and database operations, not just static screenshots?
- What is the least complex secure design and its alternatives? Explain recommendations and trade-offs.

### 3. Specify behavior and evidence

For each slice, identify `PRODUCT.md` requirement IDs, input/output contracts, authorization matrix, data changes, migrations, UI states, errors and minimum tests. Show one textual sequence diagram or Mermaid flow only when it resolves ambiguity. Name exact behavior for unsupported owner business approvals rather than auto-filling them.

## 3. Git workflow (permanent rule)

This skill now follows the permanent Git workflow defined in `AGENTS.md`. Every authorized implementation or documentation task must be completed using the step-by-step automated stage → commit → push workflow. Do not make any additional modifications to the Git workflow beyond what's specified in `AGENTS.md`.

### 4. Implement a vertical slice

Favor small, end-to-end commits: domain types → SQL/RLS/service → form/API → UI → tests. Reuse components where practical. For SQL sensitive to races, put critical invariant in DB constraints/transactional function; unit tests alone cannot prove concurrency safety. Never run destructive DB changes against production automatically. Preserve existing inquiries and guest-data privacy.

### 5. Test at the correct level

At minimum as relevant:
- Unit: package pricing, rate precedence, rounding, check-in/out semantics, status machine, holiday and override scenarios, media validators, consent.
- Integration: database RLS and explicit owner role, quote snapshots, transactionally safe confirmation, owner date blocks, audit events, storage permissions, notification failure.
- E2E: Android and iOS-sized mobile screens, keyboard, request calendar, all three packages, owner pricing edit/publish, photo/video selection, manual-channel entry, verified-deposit confirmation.
- Stress: simultaneous booking confirmations on the same stay; only one can win, the other gets a clear conflict and no false confirmation.
- Operational: backup+restore rehearsal, email failures, offline/retry behavior, expired holds, provider limits, and safe secrets.

Execute repository scripts if the runtime supports them (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`). Report pass/fail/skipped/not-run accurately. `test:e2e` may need a configured app/database to be meaningful.

### 6. Red team against actual abuse cases

| ID | Attack / failure | Required defense / evidence |
|---|---|---|
| RT-01 | Two owners confirm overlapping packages simultaneously | Database-level single-property exclusion rule with concurrent transaction test |
| RT-02 | Malicious guest posts `confirmed=true` or altered quote | Server ignores client authorization/status/amount; immutable server quote |
| RT-03 | Any authenticated Supabase account reads owner inbox or changes rate | Explicit membership/role checks + correctly scoped RLS |
| RT-04 | Guest sees another guest's phone/email/payment screenshot | No PII in public availability or media APIs; IDOR test |
| RT-05 | Owner edits rate after request received | Historical quote snapshot; clear requote consent path |
| RT-06 | Fake payment screenshot/deposit reference | Owner independently verifies funds; no screenshot-only auto-confirm |
| RT-07 | Uploaded SVG/HTML/polyglot or forged MIME/oversized video | Signature checks, type allowlist, quota, private quarantine, safe serving |
| RT-08 | iPhone HEIC/MOV upload appears successful but cannot play | Real device acceptance test; processing state + conversion/fallback |
| RT-09 | Date spans cross year/month or checkout at next check-in | `[start,end)` local-date interval logic; property-wide overlap tests |
| RT-10 | Stale/expired hold permanently blocks available nights | Explicit expiry, reliable cleanup, event trail, recovery UI |
| RT-11 | Public rate value never owner approved | Draft/publish gating and access audit |
| RT-12 | Server/email/upload service fails mid-action | Persist-first/outbox/retry; never show fake success; idempotency |
| RT-13 | CSV/formula injection in owner exports | Escape Excel formula prefixes and quote fields properly |
| RT-14 | Guest harassment, spam or enumeration | Rate limits, generic errors, abuse monitoring, purpose-limited PII |
| RT-15 | Production launched on static host with dead admin/features | End-to-end deployed smoke test on compatible platform |
| RT-16 | Owner cancels a paid reservation without auditable refund obligation | Immutable payment events + explicit refund tracking/owner task |

Classify findings by severity and user impact. Block release for an unresolved critical/high-severity flaw affecting money, private data, or date collisions.

### 7. Review and report

Provide a compact **evidence-based** report: changed files, requirements addressed, actual commands and exit status, proof of UI behavior, DB/RLS results, red-team findings, limitations, safe next work. Update `PRODUCT.md` status only after tests confirm implementation. Owner approval fields remain pending until owner supplies evidence.

## Product and technical trade-offs to apply

- **Calendar library:** choose an accessible range picker compatible with the installed React/Next versions; avoid adding heavyweight libraries merely for visual effect.
- **Pricing:** implement base/day-of-week/holiday/selected-date override with deterministic precedence and a rate-version snapshot. Do not silently discount or fabricate holidays.
- **Availability:** confirmed bookings, explicit owner blocks and approved temporary holds all reserve the **whole property**, independent of bedroom package. Pending enquiries don't block unless manually held.
- **Video uploads:** Android/iPhone gallery-picker support; inspect codecs, enforce limits, use resumable uploads for larger files; never imply transcoding works without a real pipeline and tests.
- **Security:** fix baseline overly broad `authenticated` RLS before enabling edits or payment events.
- **Cost:** report recurring hosting/storage/video processing costs and require owner approval before enabling costly services.

## Useful sub-prompts

**Audit:** `Use the TEN29 engineering skill in AUDIT mode. Compare PRODUCT.md to main and inspect the real security, calendar, rates, and media gaps. No code changes.`

**Build:** `Use the TEN29 engineering skill in BUILD mode. Implement PRODUCT.md's approved slice [IDs] end to end with migration, RLS, tests and no additional planning files.`

**Red team:** `Use the TEN29 engineering skill in REVIEW/RED TEAM mode. Attempt to break the booking confirmation concurrency, price snapshot, unauthorized admin access and device media workflow. Report reproduction evidence.`

**Release:** `Use the TEN29 engineering skill in RELEASE mode. Do not deploy unless owner approval, backup, DB concurrency proof, RLS, upload security and production smoke tests are demonstrated.`
