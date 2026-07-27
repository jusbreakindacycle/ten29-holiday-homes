# 09 — Data Model

## Option 1 — `inquiries` table (implemented)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `reference_code` | `text` | Unique, human-readable, e.g. `TEN29-20260727-AB12` |
| `source` | `text` | e.g. `website`, `facebook` |
| `utm_source` | `text` (nullable) | |
| `utm_medium` | `text` (nullable) | |
| `utm_campaign` | `text` (nullable) | |
| `full_name` | `text` | Required |
| `email` | `text` (nullable) | Optional, validated when present |
| `mobile_number` | `text` | Required |
| `check_in_date` | `date` | Required |
| `check_out_date` | `date` | Required, must be after `check_in_date` |
| `adults` | `smallint` | Required, ≥ 1 |
| `children` | `smallint` | Default 0 |
| `day_visitors` | `smallint` | Default 0 |
| `vehicles` | `smallint` | Default 0 |
| `purpose_of_stay` | `text` (nullable) | |
| `message` | `text` (nullable) | |
| `privacy_consent` | `boolean` | Required `true` |
| `status` | `text` | Enum: `NEW`, `REVIEWING`, `CONTACTED`, `CLOSED`, `SPAM` |
| `owner_notes` | `text` (nullable) | |
| `notification_status` | `text` | Enum: `PENDING`, `SENT`, `FAILED` |
| `notification_error` | `text` (nullable) | |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`, updated by trigger |
| `contacted_at` | `timestamptz` (nullable) | |
| `closed_at` | `timestamptz` (nullable) | |

Statuses are intentionally limited to enquiry-lifecycle states. There is no `BOOKING_CONFIRMED`, `PAID`, `CHECKED_IN`, or `COMPLETED` status in Option 1, because Option 1 is not the booking system — see [[19_UPGRADE_ROADMAP]].

## Option 1 — `inquiry_audit_events` table (implemented)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `inquiry_id` | `uuid` | FK → `inquiries.id` |
| `event_type` | `text` | `CREATED`, `NOTIFICATION_ATTEMPTED`, `NOTIFICATION_SENT`, `NOTIFICATION_FAILED`, `STATUS_CHANGED`, `NOTE_CHANGED` |
| `previous_value` | `text` (nullable) | |
| `new_value` | `text` (nullable) | |
| `actor` | `text` (nullable) | `system` or admin user id/email |
| `created_at` | `timestamptz` | Default `now()` |

## Option 1 — `admin_users` (implemented via Supabase Auth)

Admin identity is Supabase Auth's own `auth.users` table. No separate application table is required for Option 1; role/authorization is enforced by RLS policies scoped to authenticated users (see [[10_TECHNICAL_ARCHITECTURE]] and `supabase/migrations`).

## Future Option 2 entities (documented, not implemented)

`guests`, `bookings`, `booking_status_history`, `availability_blocks`, `date_holds`, `rate_plans`, `payments`, `payment_evidence`, `security_deposit_ledger`, `refunds`, `policy_versions`, `audit_logs`.

These will reference `inquiries.id` where a booking originates from a website enquiry, but will not require altering the `inquiries` table's meaning.

## Future Option 3 entities (documented, not implemented)

`messaging_contacts`, `messaging_identities`, `conversations`, `messages`, `lead_scores`, `automation_runs`, `payment_gateway_events`, `webhook_events`, `notification_jobs`.

## Migration discipline

All schema changes live in `supabase/migrations/*.sql`, numbered sequentially, forward-only. No destructive migration runs against production without a documented backup step (see [[18_DEPLOYMENT_AND_OPERATIONS]]).
