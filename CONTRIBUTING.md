# Contributing

This is a client project for TEN29 Holiday Homes, not an open-source project — but the same discipline applies to every change.

## Before you start

Read [`CLAUDE.md`](./CLAUDE.md). It has the rules that exist to protect the business (no invented facts, the claim gate, enquiry-vs-booking language) and the ones that keep the codebase coherent (code conventions, test commands).

## Workflow

1. Make your change.
2. Update the relevant file(s) in `docs/` in the same change if you touched scope, business facts, architecture, or claim status.
3. If you changed `src/content/claims.ts`, update `docs/05_OWNER_APPROVAL_MATRIX.md` to match.
4. Run the full quality gate before calling anything done:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
5. Append a dated entry to `docs/21_DECISION_LOG.md` for material decisions and `docs/25_EXECUTION_LOG.md` for commands run and outcomes.

## Claim changes

Never hard-code a proposed or unverified business value directly into a public-facing component. Add it to `src/content/claims.ts` with the correct status, and let `getPublicClaim()`/`isPublicClaim()` gate it. See `docs/13_CONTENT_AND_CLAIM_STANDARD.md`.

## Commit hygiene

- No secrets, ever — not in code, not in `.env.local`-style files, not in test fixtures.
- No real guest data in the repository, including seed files.
- Keep commits scoped; don't bundle unrelated doc updates with unrelated code changes unless they're genuinely the same change.
