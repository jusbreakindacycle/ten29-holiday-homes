-- TEN29 Holiday Homes — Option 1 schema: booking enquiries + audit trail.
-- See docs/09_DATA_MODEL.md. Forward-only migration.

create extension if not exists pgcrypto;

create type inquiry_status as enum ('NEW', 'REVIEWING', 'CONTACTED', 'CLOSED', 'SPAM');
create type notification_status as enum ('PENDING', 'SENT', 'FAILED');

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  source text not null default 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  full_name text not null,
  email text,
  mobile_number text not null,
  check_in_date date not null,
  check_out_date date not null,
  adults smallint not null default 1,
  children smallint not null default 0,
  day_visitors smallint not null default 0,
  vehicles smallint not null default 0,
  purpose_of_stay text,
  message text,
  privacy_consent boolean not null default false,
  status inquiry_status not null default 'NEW',
  owner_notes text,
  notification_status notification_status not null default 'PENDING',
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  closed_at timestamptz,
  constraint inquiries_dates_check check (check_out_date > check_in_date),
  constraint inquiries_privacy_consent_check check (privacy_consent = true),
  constraint inquiries_adults_check check (adults >= 1)
);

comment on table public.inquiries is
  'Option 1 booking enquiries. Not a booking/reservation table — see docs/19_UPGRADE_ROADMAP.md for the Option 2 bookings table this will feed.';

create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_check_in_date_idx on public.inquiries (check_in_date);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

create table if not exists public.inquiry_audit_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  event_type text not null,
  previous_value text,
  new_value text,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists inquiry_audit_events_inquiry_id_idx
  on public.inquiry_audit_events (inquiry_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row
  execute function public.set_updated_at();
