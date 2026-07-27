# 08 — User Flows

## Option 1 enquiry flow

1. Guest arrives from Google, Facebook, Messenger, or a direct link.
2. Guest reviews approved property information on `/`, `/property`, `/gallery`, `/rates`, `/location`, `/faq`.
3. Guest opens `/book` or `/availability`.
4. Guest enters requested stay dates and group details.
5. The application validates the request on the server (Zod schema, shared with the client for inline feedback).
6. The application persists the inquiry first (Supabase insert).
7. The application generates a human-readable inquiry reference (e.g. `TEN29-20260727-AB12`).
8. The application attempts owner notification email (Resend).
9. Email failure is logged (`notification_status = FAILED`, `notification_error` recorded) without deleting or rejecting the stored inquiry.
10. The guest sees a success page that clearly states: the request was received; the date is not reserved; the stay is not confirmed; TEN29 will reply with verified availability, price, and payment instructions.
11. If an email address was supplied, the guest receives an acknowledgement email restating the same points.
12. The owner reviews the inquiry in `/admin/inquiries` and contacts the guest manually (phone/Messenger).
13. Payment and final confirmation remain outside the Option 1 website entirely.

## Facebook-to-website flow in Option 1

There is no Meta API integration in Option 1. The supported flow is manual and link-based:

- Facebook posts and Messenger replies can send guests to `/book?source=facebook` or a UTM-tagged equivalent (`/book?utm_source=facebook&utm_medium=messenger&utm_campaign=...`).
- The form records `source`, `utm_source`, `utm_medium`, `utm_campaign` from the query string.
- Facebook-only conversations that never reach the website are not automatically synchronized anywhere — the owner still tracks those manually inside Messenger, as today.
- This must never be described as "automated Facebook integration" in any UI copy or marketing material.

## Admin review flow

1. Owner/staff signs in at `/admin/login` via Supabase Auth (email + password).
2. Dashboard (`/admin`) shows counts by status and recent notification failures.
3. Owner opens `/admin/inquiries`, filters by status/date/source/text.
4. Owner opens an inquiry detail, updates status (`NEW → REVIEWING → CONTACTED → CLOSED`, or `SPAM`), and adds notes.
5. Owner manually contacts the guest by phone/Messenger with verified availability, price, and payment instructions — outside the website.
6. Owner exports CSV for offline record-keeping if needed.

## Owner claim-approval flow

1. Developer adds/updates a proposed claim in `src/content/claims.ts` with status `PROPOSED_PENDING_APPROVAL`.
2. Owner reviews it at `/admin/owner-preview`, which is authenticated and never public.
3. Owner approves verbally/in writing outside the repo (e.g. messaging, signed document); developer updates the claim's status, `approvedBy`, and `approvedAt`.
4. Only then does `isPublicClaim()` allow the value to render on public routes.
