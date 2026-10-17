# 18 — Deployment and Operations

## Production account ownership

All production accounts must belong to TEN29 or the owner's official email — never the developer's personal accounts:

- Cloudflare (registrar + DNS)
- Domain (`ten29holidayhomes.com`, pending availability)
- Vercel
- Supabase
- Resend
- Google Workspace (optional mailbox)
- Future Cloudflare R2
- Future OpenAI (Option 3)
- Future Meta developer app (Option 3)
- Future PayMongo (Option 3)

The developer receives only the access necessary to build and maintain (collaborator/member role, not sole owner) — see [[23_OWNER_HANDOVER]].

## Option 1 recurring structure (current expectation, not a guarantee)

**Required:**

- Vercel Pro for commercial hosting
- Domain registration/renewal at registrar checkout

**Free or low-volume launch tiers:**

- Supabase Free pilot
- Resend Free
- Cloudflare R2 — not required unless used
- Google Workspace — optional but recommended for `bookings@ten29holidayhomes.com`

## Supabase Free-tier warning

Free-tier Supabase projects can pause after a period of inactivity, and have connection/storage limits. Email notification must remain a functioning operational fallback so the owner is not solely dependent on dashboard access. Upgrading to Supabase Pro is part of the Option 2 upgrade path, or can be purchased earlier if TEN29 needs stronger reliability sooner.

## Environments

| Environment | Purpose |
|---|---|
| Local development | `npm run dev`, ignored `.env.local`, and the repository's local Supabase stack; local Supabase CLI values are required before database-backed flows work |
| Preview/staging | Not provisioned. Any future environment requires an owner-controlled Node 22-compatible runtime, separate Supabase project, restricted access, TLS and test-safe notification routing |
| Production | Not deployed or authorized. Domain, hosting, Supabase and email ownership/configuration must be verified with the actual owner before release |

## Environment variables

See the tracked, credential-free `.env.example` for the local variable names and placeholder formats. Copy it to `.env.local` only when `.env.local` is absent, then replace Supabase placeholders only with local Supabase CLI values. `.env.local`, staging environment files and provider secrets remain ignored/untracked. Never commit populated environment files or point local/provider tests at production.

## Backups and recovery

- Supabase Free-tier limitations are documented above; do not assume automatic long-retention backups.
- Export `inquiries` to CSV (via `/admin/inquiries`) before running any migration against production.
- All schema changes are kept in `supabase/migrations/` in source control — the migration history is itself a recovery aid.
- Recovery steps: restore from the most recent CSV export and/or Supabase point-in-time recovery (if the plan tier supports it), then replay migrations from source control on a fresh project if needed.
- Email inbox is never treated as the system of record — the database is authoritative.
- The database is never treated as the only notification channel — email notification is a required operational signal, not a nice-to-have.

## Health check

`GET /api/health` returns a minimal JSON status (`{ ok: true }` plus a database reachability check) for uptime monitoring. It is not linked from navigation and returns no personal data.
