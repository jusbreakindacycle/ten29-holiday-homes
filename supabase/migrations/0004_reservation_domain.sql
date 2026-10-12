create type public.booking_package_code as enum (
  'WHOLE_HOME_1BR',
  'WHOLE_HOME_2BR',
  'WHOLE_HOME_3BR'
);

create type public.booking_request_source as enum (
  'WEBSITE',
  'MESSENGER',
  'PHONE',
  'WALK_IN',
  'EXTERNAL_PLATFORM',
  'OTHER'
);

create type public.booking_request_status as enum (
  'NEW',
  'REVIEWING',
  'QUOTED',
  'AWAITING_DEPOSIT',
  'DECLINED',
  'WITHDRAWN',
  'EXPIRED'
);

create type public.booking_quote_status as enum ('DRAFT', 'ISSUED');
create type public.booking_deposit_status as enum ('RECORDED_UNVERIFIED', 'VERIFIED', 'REJECTED');
create type public.reservation_status as enum ('CONFIRMED', 'COMPLETED', 'CANCELLED');

alter table public.ten29_admins
  add column role text not null default 'MANAGER'
  check (role in ('OWNER', 'MANAGER'));

create function public.is_ten29_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ten29_admins
    where user_id = (select auth.uid()) and role = 'OWNER'
  );
$$;

revoke all on function public.is_ten29_owner() from public, anon;
grant execute on function public.is_ten29_owner() to authenticated;

create table public.booking_properties (
  id smallint primary key check (id = 1),
  timezone text not null default 'Asia/Manila' check (timezone = 'Asia/Manila')
);

insert into public.booking_properties (id) values (1);

create table public.property_packages (
  code public.booking_package_code primary key,
  property_id smallint not null default 1 references public.booking_properties (id) on delete restrict,
  bedrooms_access smallint not null unique check (bedrooms_access between 1 and 3),
  occupancy_scope text not null default 'WHOLE_PROPERTY' check (occupancy_scope = 'WHOLE_PROPERTY'),
  max_guests smallint null check (max_guests is null or max_guests > 0),
  created_at timestamptz not null default now(),
  constraint property_package_code_matches_access check (
    (code = 'WHOLE_HOME_1BR' and bedrooms_access = 1)
    or (code = 'WHOLE_HOME_2BR' and bedrooms_access = 2)
    or (code = 'WHOLE_HOME_3BR' and bedrooms_access = 3)
  )
);

insert into public.property_packages (code, bedrooms_access) values
  ('WHOLE_HOME_1BR', 1),
  ('WHOLE_HOME_2BR', 2),
  ('WHOLE_HOME_3BR', 3);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid unique,
  inquiry_id uuid unique references public.inquiries (id) on delete restrict,
  property_id smallint not null default 1 references public.booking_properties (id) on delete restrict,
  package_code public.booking_package_code not null references public.property_packages (code) on delete restrict,
  source public.booking_request_source not null,
  check_in_date date not null,
  check_out_date date not null,
  status public.booking_request_status not null default 'NEW',
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_request_dates_check check (check_out_date > check_in_date),
  constraint website_request_requires_enquiry check (source <> 'WEBSITE' or inquiry_id is not null)
);

create index booking_requests_status_created_idx
  on public.booking_requests (status, created_at desc);
create index booking_requests_dates_idx
  on public.booking_requests (check_in_date, check_out_date);

create table public.booking_quotes (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid unique,
  request_id uuid not null references public.booking_requests (id) on delete restrict,
  revision smallint not null check (revision > 0),
  status public.booking_quote_status not null default 'DRAFT',
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  amount_total numeric(12, 2) null check (amount_total is null or amount_total >= 0),
  required_deposit_amount numeric(12, 2) null check (
    required_deposit_amount is null or required_deposit_amount >= 0
  ),
  valid_until timestamptz null,
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  owner_approved_by uuid null references auth.users (id) on delete restrict,
  owner_approved_at timestamptz null,
  issued_by uuid null references auth.users (id) on delete restrict,
  issued_at timestamptz null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint booking_quote_revision_unique unique (request_id, revision),
  constraint booking_quote_deposit_not_over_total check (
    required_deposit_amount is null or amount_total is null or required_deposit_amount <= amount_total
  ),
  constraint booking_quote_approval_actor_pair check (
    (owner_approved_by is null) = (owner_approved_at is null)
  ),
  constraint booking_quote_issuer_pair check (
    (issued_by is null) = (issued_at is null)
  ),
  constraint issued_quote_requires_approval check (
    status <> 'ISSUED' or (owner_approved_by is not null and issued_by is not null)
  )
);

create index booking_quotes_request_revision_idx
  on public.booking_quotes (request_id, revision desc);

create table public.booking_deposits (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid unique,
  request_id uuid not null references public.booking_requests (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text null check (payment_method is null or char_length(payment_method) <= 40),
  external_reference_masked text null check (
    external_reference_masked is null
    or (char_length(external_reference_masked) <= 80 and external_reference_masked !~ '[0-9]{5,}')
  ),
  status public.booking_deposit_status not null default 'RECORDED_UNVERIFIED',
  recorded_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  recorded_at timestamptz not null default now(),
  verified_by uuid null references auth.users (id) on delete restrict,
  verified_at timestamptz null,
  constraint booking_deposit_verification_actor_pair check (
    (verified_by is null) = (verified_at is null)
  ),
  constraint booking_deposit_verification_state check (
    (status = 'RECORDED_UNVERIFIED' and verified_by is null)
    or (status in ('VERIFIED', 'REJECTED') and verified_by is not null)
  )
);

create index booking_deposits_request_recorded_idx
  on public.booking_deposits (request_id, recorded_at desc);

create table public.booking_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.booking_requests (id) on delete restrict,
  previous_status public.booking_request_status null,
  new_status public.booking_request_status not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index booking_request_events_request_created_idx
  on public.booking_request_events (request_id, created_at desc);

create table public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.booking_requests (id) on delete restrict,
  status public.reservation_status not null default 'CONFIRMED',
  created_by uuid not null references auth.users (id) on delete restrict,
  confirmed_at timestamptz not null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_terminal_timestamps check (
    (status <> 'COMPLETED' or completed_at is not null)
    and (status <> 'CANCELLED' or cancelled_at is not null)
  )
);

create table public.booking_reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.booking_reservations (id) on delete restrict,
  previous_status public.reservation_status null,
  new_status public.reservation_status not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create function public.guard_booking_request_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_ten29_admin() then
    raise insufficient_privilege using message = 'TEN29 administrator authorization required';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'NEW' then
      raise check_violation using message = 'Booking requests must start in NEW';
    end if;
    new.created_by := (select auth.uid());
    if new.source = 'WEBSITE' and not exists (
      select 1 from public.inquiries i
      where i.id = new.inquiry_id
        and lower(i.source) = 'website'
        and i.check_in_date = new.check_in_date
        and i.check_out_date = new.check_out_date
    ) then
      raise check_violation using message = 'Website requests must match a linked website enquiry';
    end if;
    if new.source <> 'WEBSITE' and new.inquiry_id is not null then
      raise check_violation using message = 'Manual requests cannot link to website enquiries';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.inquiry_id is distinct from old.inquiry_id
    or new.property_id is distinct from old.property_id
    or new.package_code is distinct from old.package_code
    or new.source is distinct from old.source
    or new.check_in_date is distinct from old.check_in_date
    or new.check_out_date is distinct from old.check_out_date
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise check_violation using message = 'Booking request details are immutable';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'NEW' and new.status in ('REVIEWING', 'DECLINED', 'WITHDRAWN', 'EXPIRED'))
      or (old.status = 'REVIEWING' and new.status in ('QUOTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'))
      or (old.status = 'QUOTED' and new.status in ('AWAITING_DEPOSIT', 'DECLINED', 'WITHDRAWN', 'EXPIRED'))
      or (old.status = 'AWAITING_DEPOSIT' and new.status in ('QUOTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'))
    ) then
      raise check_violation using message = 'Invalid booking request status transition';
    end if;

    if new.status = 'QUOTED' and not exists (
      select 1 from public.booking_quotes q
      where q.request_id = new.id and q.status = 'ISSUED'
        and q.owner_approved_by is not null and q.issued_by is not null
    ) then
      raise check_violation using message = 'An owner-issued quote is required before QUOTED';
    end if;

    if new.status = 'AWAITING_DEPOSIT' and not exists (
      select 1 from public.booking_quotes q
      where q.request_id = new.id
        and q.status = 'ISSUED'
        and q.owner_approved_at is not null
        and q.required_deposit_amount is not null
    ) then
      raise check_violation using message = 'An owner-approved quote with an approved deposit is required';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function public.record_booking_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.booking_request_events (request_id, previous_status, new_status, actor_id)
  values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    (select auth.uid())
  );
  return new;
end;
$$;

create function public.guard_booking_quote_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_ten29_admin() then
    raise insufficient_privilege using message = 'TEN29 administrator authorization required';
  end if;
  if new.status <> 'DRAFT'
    or new.owner_approved_by is not null
    or new.owner_approved_at is not null
    or new.issued_by is not null
    or new.issued_at is not null then
    raise check_violation using message = 'Quotes must be created as unapproved drafts';
  end if;
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create function public.guard_booking_quote_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'ISSUED'
    or new.id is distinct from old.id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.request_id is distinct from old.request_id
    or new.revision is distinct from old.revision
    or new.currency is distinct from old.currency
    or new.amount_total is distinct from old.amount_total
    or new.required_deposit_amount is distinct from old.required_deposit_amount
    or new.valid_until is distinct from old.valid_until
    or new.line_items is distinct from old.line_items
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise check_violation using message = 'Quote snapshots are immutable';
  end if;
  return new;
end;
$$;

create function public.guard_booking_deposit_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_ten29_admin() then
    raise insufficient_privilege using message = 'TEN29 administrator authorization required';
  end if;
  if new.status <> 'RECORDED_UNVERIFIED'
    or new.verified_by is not null
    or new.verified_at is not null then
    raise check_violation using message = 'Deposits must be recorded as unverified';
  end if;
  if not exists (
    select 1 from public.booking_requests r
    where r.id = new.request_id and r.status = 'AWAITING_DEPOSIT'
  ) then
    raise check_violation using message = 'Request must be awaiting deposit';
  end if;
  new.recorded_by := (select auth.uid());
  return new;
end;
$$;

create function public.guard_booking_deposit_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise check_violation using message = 'Deposit history is immutable';
end;
$$;

create function public.issue_booking_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  if not public.is_ten29_owner() then
    raise insufficient_privilege using message = 'TEN29 owner authorization required';
  end if;

  update public.booking_quotes
  set status = 'ISSUED',
      owner_approved_by = (select auth.uid()),
      owner_approved_at = now(),
      issued_by = (select auth.uid()),
      issued_at = now()
  where id = p_quote_id
    and status = 'DRAFT'
    and amount_total is not null
    and required_deposit_amount is not null
  returning request_id into v_request_id;

  if v_request_id is null then
    raise check_violation using message = 'Quote must be a draft with owner-approved total and deposit';
  end if;

  update public.booking_requests
  set status = 'QUOTED'
  where id = v_request_id and status = 'REVIEWING';

  if not found then
    raise check_violation using message = 'Request must be under review before its quote can be issued';
  end if;
end;
$$;

revoke all on function public.issue_booking_quote(uuid) from public, anon;
grant execute on function public.issue_booking_quote(uuid) to authenticated;

create trigger booking_requests_guard_write
  before insert or update on public.booking_requests
  for each row execute function public.guard_booking_request_write();

create trigger booking_requests_record_initial_event
  after insert on public.booking_requests
  for each row
  execute function public.record_booking_request_event();

create trigger booking_requests_record_transition_event
  after update of status on public.booking_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.record_booking_request_event();

create trigger booking_quotes_guard_insert
  before insert on public.booking_quotes
  for each row execute function public.guard_booking_quote_insert();

create trigger booking_quotes_guard_update
  before update on public.booking_quotes
  for each row execute function public.guard_booking_quote_update();

create trigger booking_deposits_guard_insert
  before insert on public.booking_deposits
  for each row execute function public.guard_booking_deposit_insert();

create trigger booking_deposits_guard_update
  before update on public.booking_deposits
  for each row execute function public.guard_booking_deposit_update();

alter table public.booking_properties enable row level security;
alter table public.property_packages enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_quotes enable row level security;
alter table public.booking_deposits enable row level security;
alter table public.booking_request_events enable row level security;
alter table public.booking_reservations enable row level security;
alter table public.booking_reservation_events enable row level security;

revoke all on public.booking_properties, public.property_packages, public.booking_requests,
  public.booking_quotes, public.booking_deposits, public.booking_request_events,
  public.booking_reservations from public, anon, authenticated;
revoke all on public.booking_reservation_events from public, anon, authenticated;
revoke all on function public.guard_booking_request_write() from public, anon, authenticated;
revoke all on function public.record_booking_request_event() from public, anon, authenticated;
revoke all on function public.guard_booking_quote_insert() from public, anon, authenticated;
revoke all on function public.guard_booking_quote_update() from public, anon, authenticated;
revoke all on function public.guard_booking_deposit_insert() from public, anon, authenticated;
revoke all on function public.guard_booking_deposit_update() from public, anon, authenticated;

grant select on public.property_packages to authenticated;
grant select, insert (id, idempotency_key, inquiry_id, package_code, source, check_in_date, check_out_date),
  update (status) on public.booking_requests to authenticated;
grant select on public.booking_request_events to authenticated;
grant select, insert (idempotency_key, request_id, revision, currency, amount_total,
  required_deposit_amount, valid_until, line_items) on public.booking_quotes to authenticated;
grant select, insert (idempotency_key, request_id, amount, payment_method, external_reference_masked)
  on public.booking_deposits to authenticated;
grant select on public.booking_reservations to authenticated;
grant select on public.booking_reservation_events to authenticated;

create policy "TEN29 admins can read booking packages"
  on public.property_packages for select to authenticated
  using (public.is_ten29_admin());

create policy "TEN29 admins can read booking requests"
  on public.booking_requests for select to authenticated
  using (public.is_ten29_admin());
create policy "TEN29 admins can create booking requests"
  on public.booking_requests for insert to authenticated
  with check (public.is_ten29_admin());
create policy "TEN29 admins can transition booking requests"
  on public.booking_requests for update to authenticated
  using (public.is_ten29_admin())
  with check (public.is_ten29_admin());

create policy "TEN29 admins can read booking request events"
  on public.booking_request_events for select to authenticated
  using (public.is_ten29_admin());

create policy "TEN29 admins can read booking quotes"
  on public.booking_quotes for select to authenticated
  using (public.is_ten29_admin());
create policy "TEN29 admins can create booking quote drafts"
  on public.booking_quotes for insert to authenticated
  with check (public.is_ten29_admin() and status = 'DRAFT'
    and owner_approved_by is null and owner_approved_at is null
    and issued_by is null and issued_at is null);

create policy "TEN29 admins can read booking deposits"
  on public.booking_deposits for select to authenticated
  using (public.is_ten29_admin());
create policy "TEN29 admins can record unverified deposits"
  on public.booking_deposits for insert to authenticated
  with check (public.is_ten29_admin() and status = 'RECORDED_UNVERIFIED'
    and verified_by is null and verified_at is null);

create policy "TEN29 admins can read future reservations"
  on public.booking_reservations for select to authenticated
  using (public.is_ten29_admin());

create policy "TEN29 admins can read reservation events"
  on public.booking_reservation_events for select to authenticated
  using (public.is_ten29_admin());

comment on table public.booking_requests is
  'Request lifecycle is distinct from legacy inquiries and from confirmed reservations. Dates are Asia/Manila local calendar dates.';
comment on table public.booking_reservations is
  'Future confirmed reservation records. No authenticated write privilege or confirmation operation exists in this migration.';
comment on table public.booking_deposits is
  'Append-only deposit intake; this slice permits recording only unverified amounts and masked references.';