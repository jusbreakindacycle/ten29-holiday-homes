# 15 — Security and Privacy

## Option 1 data collected

Only what an initial enquiry needs:

- name, mobile number, optional email
- requested check-in/check-out dates
- adults, children, day visitors, vehicles
- purpose of stay, optional message
- privacy consent
- source/UTM attribution

## Explicitly not collected in Option 1

- Government ID
- Payment proof / screenshots
- Bank account details
- Card data
- Full residential address
- Birth date
- Any other sensitive personal data not required for an enquiry

## Required safeguards

- A TEN29-specific privacy notice (`/privacy`) explains what is collected, why, that an enquiry is not a confirmed booking, and how contact/retention works.
- A placeholder privacy contact (`PRIVACY_CONTACT_EMAIL`) is used until the owner approves a final address.
- All inquiry input is validated and sanitized server-side (Zod) before persistence.
- Supabase access uses server-side clients only; the anon key used by any client-side code is constrained by RLS to the narrow operations the public form needs (insert-only, no read of other guests' data).
- Guest personal fields (name, email, mobile, message) are not written to application logs — only the reference code, status, and non-personal metadata are logged.
- A twelve-month enquiry-retention default is recommended as `PROPOSED_PENDING_APPROVAL` — not stated to guests as settled policy until the owner approves it.
- A documented delete/export procedure exists for admin use (see [[18_DEPLOYMENT_AND_OPERATIONS]]).
- The exact block-and-lot address is never rendered on public routes by default; only the general subdivision/barangay/city/postal description is public (see claim `CLM-BIZ-004`).
- Payment and government-ID storage are out of scope for Option 1 entirely — there is no code path that accepts either.

## Admin security

- No public self-registration route exists for admin accounts.
- Initial admin account(s) are created directly in Supabase Auth by the developer, then handed to the owner with a forced password reset (see [[23_OWNER_HANDOVER]]).
- Password policy: Supabase Auth default minimum (8+ characters) with a documented recommendation for a longer passphrase.
- Password resets go through Supabase Auth's standard email-reset flow.
- Every `/admin/*` route is protected server-side (layout-level session check via `@supabase/ssr`, redirecting unauthenticated requests to `/admin/login`) — this is not client-side-only route guarding.
- RLS policies restrict `inquiries` table reads/writes to the `service_role` key (used only in server code) plus a narrow authenticated-read policy for admin UI queries executed through the server.
- Session handling follows the official Supabase SSR cookie pattern for Next.js.
- Status and note changes write an `inquiry_audit_events` row with actor, previous value, new value, and timestamp.
- The owner-preview route (`/admin/owner-preview`) is gated behind the same authenticated-session check and additionally behind `NEXT_PUBLIC_ENABLE_OWNER_PREVIEW` so it can be fully disabled in a given environment.
