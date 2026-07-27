# 23 — Owner Handover

This document tells the TEN29 owner exactly what they need to do, own, and approve to take Option 1 from "code complete" to "live."

## Accounts the owner must create (under TEN29 or the owner's official email — never the developer's personal account)

1. **Cloudflare** — domain registration for `ten29holidayhomes.com` (subject to availability) and DNS.
2. **Vercel** — hosting, on a Pro plan for commercial use.
3. **Supabase** — database + auth project (Free tier acceptable to start; see the Free-tier warning in [[18_DEPLOYMENT_AND_OPERATIONS]]).
4. **Resend** — transactional email for owner notifications and guest acknowledgements.
5. **Google Workspace** (optional but recommended) — for `bookings@ten29holidayhomes.com`.

For each, the owner invites the developer as a collaborator/member with only the access needed to build and maintain — not sole ownership.

## What the developer needs from the owner to finish deployment

- Supabase project URL + anon key + service-role key (service-role key goes only into Vercel's server-side environment variables, never into the repository).
- Resend API key and a verified sending domain/email.
- Confirmed domain purchase (or an alternate domain decision).
- Final Facebook, Instagram, and Google Maps URLs.
- Decisions on every item in [[05_OWNER_APPROVAL_MATRIX]].
- Assets listed in [[24_ASSET_REQUIREMENTS]].

## What "done" does not include

- Ongoing hosting/maintenance is not automatically included — see [[18_DEPLOYMENT_AND_OPERATIONS]] for the recurring cost structure the owner should expect.
- The website does not replace Messenger; it adds a structured enquiry channel alongside it.
- The website does not take payments.

## Initial admin account

The developer creates the first admin user directly in Supabase Auth (email + temporary password) and instructs the owner to sign in at `/admin/login` and immediately reset the password via Supabase's standard reset flow. No public registration page exists, by design.

## Owner training checklist

- How to sign in to `/admin`.
- How to read and filter the inquiry list.
- How to update an inquiry's status and add notes.
- How to export inquiries to CSV.
- How to review and approve pending claims at `/admin/owner-preview`, and what happens after approval (developer updates `src/content/claims.ts` and this becomes visible on the public site).
- Where the repository, docs, and decision log live, and that all of it stays with the owner.
