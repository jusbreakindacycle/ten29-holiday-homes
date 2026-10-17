-- Slice 3: one physical property, immutable payment decisions, atomic confirmation.
-- Existing deposits/quotes are never rewritten. No prices or payment policies seeded.
create extension if not exists btree_gist with schema extensions;
do $$ begin
  if exists (select 1 from public.booking_reservations) then
    raise exception 'Existing reservation rows require supervised reconciliation before occupancy migration';
  end if;
end $$;
create schema if not exists ten29_private;
revoke all on schema ten29_private from public, anon, authenticated;
grant usage on schema ten29_private to anon, authenticated;

create table public.booking_deposit_verifications (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  deposit_id uuid not null unique references public.booking_deposits(id) on delete restrict,
  decision text not null check (decision in ('VERIFIED', 'REJECTED')),
  independently_verified boolean not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (decision <> 'VERIFIED' or independently_verified)
);

alter table public.booking_reservations
  add column idempotency_key uuid unique,
  add column quote_id uuid references public.booking_quotes(id) on delete restrict,
  add column property_id smallint references public.booking_properties(id) on delete restrict,
  add column package_code public.booking_package_code,
  add column check_in_date date,
  add column check_out_date date,
  add column overnight_guest_count smallint,
  add column folding_foams_requested boolean,
  add column verified_deposit_total numeric(12,2),
  add constraint reservation_snapshot_dates_check check (check_out_date > check_in_date);
-- Nullable new columns preserve any historical scaffold rows; the RPC always fills them.

create table public.property_occupancies (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  property_id smallint not null default 1 references public.booking_properties(id) on delete restrict,
  check_in_date date not null,
  check_out_date date not null,
  kind text not null check (kind in ('RESERVATION', 'OWNER_BLOCK')),
  reservation_id uuid unique references public.booking_reservations(id) on delete restrict,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (check_out_date > check_in_date),
  check ((kind = 'RESERVATION') = (reservation_id is not null)),
  constraint no_overlapping_active_property_stays exclude using gist (
    property_id extensions.gist_int2_ops with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  ) where (active)
);

create table public.property_occupancy_events (
  id uuid primary key default gen_random_uuid(),
  occupancy_id uuid not null references public.property_occupancies(id) on delete restrict,
  event text not null check (event in ('CREATED', 'RELEASED')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (occupancy_id, event)
);

create function ten29_private.reject_history_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise check_violation using message = 'Booking history is immutable';
end;
$$;
create trigger deposit_verifications_immutable before update or delete
  on public.booking_deposit_verifications for each row execute function ten29_private.reject_history_change();
create trigger reservation_snapshots_immutable before update or delete
  on public.booking_reservations for each row execute function ten29_private.reject_history_change();
create trigger reservation_events_immutable before update or delete
  on public.booking_reservation_events for each row execute function ten29_private.reject_history_change();
create trigger occupancy_events_immutable before update or delete
  on public.property_occupancy_events for each row execute function ten29_private.reject_history_change();

create function ten29_private.guard_confirmed_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.overnight_guest_count is distinct from old.overnight_guest_count
    or new.folding_foams_requested is distinct from old.folding_foams_requested
    or (new.status is distinct from old.status and exists (
      select 1 from public.booking_reservations r where r.request_id = old.id
    )) then
    raise check_violation using message = 'Booking request snapshot is immutable';
  end if;
  return new;
end;
$$;
create trigger booking_requests_snapshot_guard before update on public.booking_requests
  for each row execute function ten29_private.guard_confirmed_request();

create function ten29_private.decide_deposit(
  p_deposit_id uuid, p_decision text, p_independently_verified boolean, p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_deposit public.booking_deposits;
  v_existing public.booking_deposit_verifications;
  v_id uuid;
begin
  if not public.is_ten29_owner() then
    raise insufficient_privilege using message = 'TEN29 owner authorization required';
  end if;
  if p_idempotency_key is null or p_decision is null or p_decision not in ('VERIFIED','REJECTED')
    or p_independently_verified is null or (p_decision = 'VERIFIED' and not p_independently_verified) then
    raise check_violation using message = 'Independent payment verification and a valid decision are required';
  end if;
  select * into v_deposit from public.booking_deposits where id = p_deposit_id;
  if not found then raise check_violation using message = 'Deposit not found'; end if;
  -- Consistent lock order: request before deposit, shared with confirmation.
  perform 1 from public.booking_requests where id = v_deposit.request_id for update;
  perform 1 from public.booking_deposits where id = p_deposit_id for update;
  select * into v_existing from public.booking_deposit_verifications where deposit_id = p_deposit_id;
  if found then
    if v_existing.idempotency_key = p_idempotency_key and v_existing.decision = p_decision
      and v_existing.independently_verified = p_independently_verified then return v_existing.id; end if;
    raise check_violation using message = 'Deposit already has an immutable verification decision';
  end if;
  if not exists (select 1 from public.booking_requests where id = v_deposit.request_id and status = 'AWAITING_DEPOSIT')
    or exists (select 1 from public.booking_reservations where request_id = v_deposit.request_id)
    or v_deposit.status <> 'RECORDED_UNVERIFIED' then
    raise check_violation using message = 'Request is not awaiting payment verification';
  end if;
  insert into public.booking_deposit_verifications(idempotency_key,deposit_id,decision,independently_verified,actor_id)
  values (p_idempotency_key,p_deposit_id,p_decision,p_independently_verified,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create function ten29_private.confirm_reservation(p_request_id uuid, p_quote_id uuid, p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_request public.booking_requests;
  v_quote public.booking_quotes;
  v_existing public.booking_reservations;
  v_total numeric(12,2);
  v_id uuid;
  v_occupancy_id uuid;
  v_max smallint;
begin
  if not public.is_ten29_owner() then
    raise insufficient_privilege using message = 'TEN29 owner authorization required';
  end if;
  if p_idempotency_key is null or p_quote_id is null then
    raise check_violation using message = 'Quote and idempotency key are required';
  end if;
  select * into v_request from public.booking_requests where id = p_request_id for update;
  if not found then raise check_violation using message = 'Booking request not found'; end if;
  select * into v_existing from public.booking_reservations where request_id = p_request_id;
  if found then
    if v_existing.idempotency_key = p_idempotency_key and v_existing.quote_id = p_quote_id then return v_existing.id; end if;
    raise check_violation using message = 'Request already has a reservation';
  end if;
  if v_request.status <> 'AWAITING_DEPOSIT' then
    raise check_violation using message = 'Request must be awaiting deposit';
  end if;
  select * into v_quote from public.booking_quotes where id = p_quote_id and request_id = p_request_id;
  if not found or v_quote.status <> 'ISSUED' or v_quote.owner_approved_by is null
    or v_quote.issued_by is null or v_quote.currency <> 'PHP' or v_quote.amount_total is null
    or v_quote.required_deposit_amount is null or v_quote.required_deposit_amount <= 0
    or (v_quote.valid_until is not null and v_quote.valid_until <= clock_timestamp())
    or exists (select 1 from public.booking_quotes where request_id = p_request_id
      and status = 'ISSUED' and revision > v_quote.revision) then
    raise check_violation using message = 'An applicable owner-issued quote with required down payment is required';
  end if;
  select max_guests into v_max from public.property_packages
    where code = v_request.package_code and property_id = v_request.property_id;
  if v_request.overnight_guest_count is null or v_request.overnight_guest_count < 1
    or v_request.overnight_guest_count > 8 or v_max is null
    or (v_request.folding_foams_requested and v_request.package_code <> 'WHOLE_HOME_3BR')
    or (v_request.overnight_guest_count > v_max and not
      (v_request.package_code = 'WHOLE_HOME_3BR' and v_request.folding_foams_requested)) then
    raise check_violation using message = 'Booking request exceeds eligible occupancy';
  end if;
  select coalesce(sum(d.amount),0) into v_total from public.booking_deposits d
    join public.booking_deposit_verifications v on v.deposit_id = d.id
    where d.request_id = p_request_id and v.decision = 'VERIFIED' and v.independently_verified;
  if v_total < v_quote.required_deposit_amount then
    raise check_violation using message = 'Required down payment has not been independently verified';
  end if;
  insert into public.booking_reservations(request_id,idempotency_key,quote_id,property_id,package_code,
    check_in_date,check_out_date,overnight_guest_count,folding_foams_requested,verified_deposit_total,created_by,confirmed_at)
  values (p_request_id,p_idempotency_key,p_quote_id,v_request.property_id,v_request.package_code,
    v_request.check_in_date,v_request.check_out_date,v_request.overnight_guest_count,v_request.folding_foams_requested,
    v_total,auth.uid(),clock_timestamp()) returning id into v_id;
  -- The exclusion constraint arbitrates even simultaneous transactions across packages.
  -- Any error aborts reservation, occupancy and both audit inserts together.
  insert into public.property_occupancies(idempotency_key,property_id,check_in_date,check_out_date,kind,reservation_id,created_by)
  values (p_idempotency_key,v_request.property_id,v_request.check_in_date,v_request.check_out_date,'RESERVATION',v_id,auth.uid())
  returning id into v_occupancy_id;
  if v_quote.valid_until is not null and v_quote.valid_until <= clock_timestamp() then
    raise check_violation using message = 'Quote expired while checking occupancy';
  end if;
  insert into public.booking_reservation_events(reservation_id,previous_status,new_status,actor_id)
    values (v_id,null,'CONFIRMED',auth.uid());
  insert into public.property_occupancy_events(occupancy_id,event,actor_id) values (v_occupancy_id,'CREATED',auth.uid());
  return v_id;
end;
$$;

create function ten29_private.create_owner_block(p_check_in date,p_check_out date,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing public.property_occupancies; v_id uuid;
begin
  if not public.is_ten29_owner() then raise insufficient_privilege using message = 'TEN29 owner authorization required'; end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in or p_idempotency_key is null then
    raise check_violation using message = 'Valid occupancy interval and idempotency key are required';
  end if;
  -- Serialize retries of the same key; unrelated blocks still use the exclusion constraint.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 0));
  select * into v_existing from public.property_occupancies where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.kind = 'OWNER_BLOCK' and v_existing.check_in_date = p_check_in and v_existing.check_out_date = p_check_out then
      return v_existing.id;
    end if;
    raise check_violation using message = 'Idempotency key was already used';
  end if;
  insert into public.property_occupancies(idempotency_key,check_in_date,check_out_date,kind,created_by)
    values(p_idempotency_key,p_check_in,p_check_out,'OWNER_BLOCK',auth.uid()) returning id into v_id;
  insert into public.property_occupancy_events(occupancy_id,event,actor_id) values(v_id,'CREATED',auth.uid());
  return v_id;
end;
$$;

create function ten29_private.release_owner_block(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_block public.property_occupancies;
begin
  if not public.is_ten29_owner() then raise insufficient_privilege using message = 'TEN29 owner authorization required'; end if;
  select * into v_block from public.property_occupancies where id = p_block_id for update;
  if not found or v_block.kind <> 'OWNER_BLOCK' then raise check_violation using message = 'Owner block not found'; end if;
  if not v_block.active then return; end if;
  update public.property_occupancies set active = false where id = p_block_id;
  insert into public.property_occupancy_events(occupancy_id,event,actor_id) values(p_block_id,'RELEASED',auth.uid());
end;
$$;

create function ten29_private.read_availability(p_check_in date,p_check_out date)
returns table(check_in_date date,check_out_date date) language plpgsql stable security definer set search_path = '' as $$
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in or p_check_out - p_check_in > 366 then
    raise check_violation using message = 'Availability window must be between 1 and 366 nights';
  end if;
  return query select greatest(o.check_in_date,p_check_in),least(o.check_out_date,p_check_out)
    from public.property_occupancies o where o.property_id = 1 and o.active
    and daterange(o.check_in_date,o.check_out_date,'[)') && daterange(p_check_in,p_check_out,'[)')
    order by o.check_in_date;
end;
$$;

-- Public RPCs are invokers. Privileged implementations live outside the exposed schema.
create function public.decide_booking_deposit(p_deposit_id uuid,p_decision text,p_independently_verified boolean,p_idempotency_key uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select ten29_private.decide_deposit(p_deposit_id,p_decision,p_independently_verified,p_idempotency_key);
$$;
create function public.confirm_booking_reservation(p_request_id uuid,p_quote_id uuid,p_idempotency_key uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select ten29_private.confirm_reservation(p_request_id,p_quote_id,p_idempotency_key);
$$;
create function public.create_booking_owner_block(p_check_in date,p_check_out date,p_idempotency_key uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select ten29_private.create_owner_block(p_check_in,p_check_out,p_idempotency_key);
$$;
create function public.release_booking_owner_block(p_block_id uuid)
returns void language sql security invoker set search_path = '' as $$ select ten29_private.release_owner_block(p_block_id); $$;
create function public.read_booking_availability(p_check_in date,p_check_out date)
returns table(check_in_date date,check_out_date date) language sql stable security invoker set search_path = '' as $$
  select * from ten29_private.read_availability(p_check_in,p_check_out);
$$;

alter table public.booking_deposit_verifications enable row level security;
alter table public.property_occupancies enable row level security;
alter table public.property_occupancy_events enable row level security;
revoke all on public.booking_deposit_verifications,public.property_occupancies,public.property_occupancy_events from public,anon,authenticated;
grant select on public.booking_deposit_verifications,public.property_occupancies,public.property_occupancy_events to authenticated;
create policy "TEN29 admins read payment decisions" on public.booking_deposit_verifications for select to authenticated using(public.is_ten29_admin());
create policy "TEN29 admins read occupancy" on public.property_occupancies for select to authenticated using(public.is_ten29_admin());
create policy "TEN29 admins read occupancy history" on public.property_occupancy_events for select to authenticated using(public.is_ten29_admin());

revoke all on all functions in schema ten29_private from public,anon,authenticated;
grant execute on function ten29_private.decide_deposit(uuid,text,boolean,uuid),
  ten29_private.confirm_reservation(uuid,uuid,uuid),ten29_private.create_owner_block(date,date,uuid),
  ten29_private.release_owner_block(uuid) to authenticated;
grant execute on function ten29_private.read_availability(date,date) to anon,authenticated;
revoke all on function public.decide_booking_deposit(uuid,text,boolean,uuid),public.confirm_booking_reservation(uuid,uuid,uuid),
  public.create_booking_owner_block(date,date,uuid),public.release_booking_owner_block(uuid),public.read_booking_availability(date,date)
  from public,anon,authenticated;
grant execute on function public.decide_booking_deposit(uuid,text,boolean,uuid),public.confirm_booking_reservation(uuid,uuid,uuid),
  public.create_booking_owner_block(date,date,uuid),public.release_booking_owner_block(uuid) to authenticated;
grant execute on function public.read_booking_availability(date,date) to anon,authenticated;
