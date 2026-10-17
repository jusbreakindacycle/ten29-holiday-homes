-- Slice 5: restricted server intake; no public booking INSERT or admin bypass flag.
do $$ begin if not exists(select 1 from pg_roles where rolname='ten29_intake_writer') then create role ten29_intake_writer nologin noinherit; end if; end; $$;
grant usage on schema public,ten29_private to ten29_intake_writer;
grant usage on schema ten29_private to service_role;
alter table public.booking_requests alter column created_by drop not null;
alter table public.booking_requests add constraint website_system_creator check (created_by is not null or source = 'WEBSITE');
alter table public.booking_request_events alter column actor_id drop not null;
alter table public.booking_request_events add column actor_kind text not null default 'TEN29_ADMIN' check (actor_kind in ('TEN29_ADMIN','WEBSITE_INTAKE'));
alter table public.booking_request_events add constraint request_event_actor_kind check ((actor_id is null) = (actor_kind = 'WEBSITE_INTAKE'));
create or replace function public.record_booking_request_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.booking_request_events(request_id,previous_status,new_status,actor_id,actor_kind)
  values(new.id,case when tg_op='INSERT' then null else old.status end,new.status,case when tg_op='INSERT' and new.created_by is null then null else auth.uid() end,
    case when tg_op='INSERT' and new.created_by is null then 'WEBSITE_INTAKE' else 'TEN29_ADMIN' end);
  return new;
end; $$;
create or replace function public.guard_booking_request_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and current_user = 'ten29_intake_writer' then
    if new.source <> 'WEBSITE' or new.status <> 'NEW' or new.created_by is not null or new.property_id <> 1
      or not exists (select 1 from public.inquiries i where i.id = new.inquiry_id and i.source = 'website'
        and i.check_in_date = new.check_in_date and i.check_out_date = new.check_out_date
        and i.adults + i.children = new.overnight_guest_count) then
      raise check_violation using message = 'Invalid trusted website intake';
    end if;
    return new;
  end if;
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

create or replace function public.guard_booking_request_capacity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_property_max smallint;
  v_package_max smallint;
begin
  if current_user <> 'ten29_intake_writer' and not public.is_ten29_admin() then
    raise insufficient_privilege using message = 'TEN29 administrator authorization required';
  end if;

  if new.overnight_guest_count is null then
    raise check_violation using message = 'Overnight guest count is required for new booking requests';
  end if;

  select p.max_overnight_guests into v_property_max
  from public.booking_properties p
  where p.id = new.property_id;

  select p.max_guests into v_package_max
  from public.property_packages p
  where p.property_id = new.property_id and p.code = new.package_code;

  if v_property_max is null or new.overnight_guest_count > v_property_max then
    raise check_violation using message = 'Request exceeds maximum property occupancy';
  end if;

  if v_package_max is null then
    raise check_violation using message = 'Package is not available for this property';
  end if;

  if new.folding_foams_requested and new.package_code <> 'WHOLE_HOME_3BR' then
    raise check_violation using message = 'Folding foams are available within the 3-bedroom package only';
  end if;

  if new.overnight_guest_count > v_package_max
    and not (new.package_code = 'WHOLE_HOME_3BR' and new.folding_foams_requested) then
    raise check_violation using message = 'Request exceeds selected package capacity';
  end if;

  return new;
end;
$$;


-- Serialize intake availability checks with every occupancy write, including owner blocks.
create function ten29_private.lock_occupancy_write() returns trigger language plpgsql set search_path='' as $$
begin perform pg_advisory_xact_lock(421295); return coalesce(new,old); end; $$;
revoke all on function ten29_private.lock_occupancy_write() from public,anon,authenticated;
create trigger property_occupancy_intake_lock before insert or update or delete on public.property_occupancies
for each row execute function ten29_private.lock_occupancy_write();
create table public.website_booking_intakes (
  request_id uuid primary key references public.booking_requests(id) on delete restrict,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key uuid not null,
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  estimate jsonb not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  unique(session_hash,idempotency_key)
);
create trigger website_intake_immutable before update or delete on public.website_booking_intakes for each row execute function ten29_private.reject_history_change();
create table public.booking_notification_outbox (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.booking_requests(id) on delete restrict,
  recipient_kind text not null check(recipient_kind in ('OWNER','GUEST')),
  status text not null default 'PENDING' check(status in ('PENDING','SENDING','SENT','FAILED')),
  attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
  first_attempt_at timestamptz, next_attempt_at timestamptz not null default now(), delivered_at timestamptz,
  created_at timestamptz not null default now(), unique(request_id,recipient_kind)
);
create index booking_outbox_pending on public.booking_notification_outbox(next_attempt_at) where status <> 'SENT';
create table ten29_private.intake_limits (bucket text primary key, window_start timestamptz not null, attempts integer not null);
alter table ten29_private.intake_limits enable row level security;
create policy "Restricted intake quota" on ten29_private.intake_limits for all to ten29_intake_writer using(true) with check(true);
-- Only this role has the exact read/insert privileges required by the transaction.
grant select,insert on public.inquiries,public.inquiry_audit_events,public.booking_requests,public.website_booking_intakes,public.booking_notification_outbox to ten29_intake_writer;
grant select on public.booking_properties,public.property_packages,public.property_occupancies to ten29_intake_writer;
grant select,insert,update on ten29_private.intake_limits to ten29_intake_writer;
grant execute on function public.is_ten29_admin(),ten29_private.read_prices(public.booking_package_code,date,date,integer,boolean) to ten29_intake_writer;
-- Explicit role policies; no changes to anon/authenticated booking write policies.
create policy "Restricted intake enquiries" on public.inquiries for all to ten29_intake_writer using(true) with check(true);
create policy "Restricted intake enquiry audits" on public.inquiry_audit_events for insert to ten29_intake_writer with check(true);
create policy "Restricted intake requests" on public.booking_requests for all to ten29_intake_writer using(true) with check(true);
create policy "Restricted intake property read" on public.booking_properties for select to ten29_intake_writer using(true);
create policy "Restricted intake packages read" on public.property_packages for select to ten29_intake_writer using(true);
create policy "Restricted intake occupancy read" on public.property_occupancies for select to ten29_intake_writer using(true);
alter table public.website_booking_intakes enable row level security;
alter table public.booking_notification_outbox enable row level security;
create policy "Restricted intake snapshots" on public.website_booking_intakes for all to ten29_intake_writer using(true) with check(true);
create policy "Restricted intake notification" on public.booking_notification_outbox for all to ten29_intake_writer using(true) with check(true);
create policy "Admin reads intake snapshots" on public.website_booking_intakes for select to authenticated using(public.is_ten29_admin());
create policy "Admin reads notification tasks" on public.booking_notification_outbox for select to authenticated using(public.is_ten29_admin());
revoke all on public.website_booking_intakes,public.booking_notification_outbox from public,anon,authenticated;
grant select on public.website_booking_intakes,public.booking_notification_outbox to authenticated;

-- FOR SHARE under a read-only RLS policy can filter the head row. Keep this
-- internal locking operation privileged, with no rate-update grant to intake.
create function ten29_private.lock_intake_rate_head(p_package public.booking_package_code) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.calendar_rate_heads where package_code=p_package for share;
  if not found then raise check_violation; end if;
end; $$;
revoke all on function ten29_private.lock_intake_rate_head(public.booking_package_code) from public,anon,authenticated,service_role;
grant execute on function ten29_private.lock_intake_rate_head(public.booking_package_code) to ten29_intake_writer;
create function ten29_private.accept_website_booking(p_payload jsonb,p_session text,p_key uuid,p_abuse text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_existing public.website_booking_intakes; v_inquiry uuid; v_request uuid; v_ref text; v_price jsonb; v_receipt jsonb;
  v_from date; v_to date; v_package public.booking_package_code; v_guests integer; v_bucket text; v_attempts integer;
begin
  if p_session is null or p_session !~ '^[a-f0-9]{64}$' or p_abuse is null or p_abuse !~ '^[a-f0-9]{64}$' or p_key is null
    or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 131072 then raise check_violation; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('full_name','mobile_number','email','adults','children','day_visitors','vehicles',
    'message','purpose_of_stay','privacy_consent','utm_source','utm_medium','utm_campaign','package_code','check_in_date','check_out_date','folding_foams_requested','reviewed_estimate')) then raise check_violation; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_session || p_key::text,0));
  select * into v_existing from public.website_booking_intakes where session_hash=p_session and idempotency_key=p_key;
  if found then
    if v_existing.payload_hash is distinct from encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') then raise exception using errcode='23514',message='Retry does not match the saved request'; end if;
    return v_existing.receipt || jsonb_build_object('request_id',v_existing.request_id);
  end if;
  -- Quotas are atomic across processes; retries of committed requests do not consume quota.
  foreach v_bucket in array array['global',p_abuse,p_session] loop
    insert into ten29_private.intake_limits values(v_bucket,date_trunc('hour',now()),1)
    on conflict(bucket) do update set attempts=case when intake_limits.window_start=date_trunc('hour',now()) then intake_limits.attempts+1 else 1 end,
      window_start=date_trunc('hour',now()) returning attempts into v_attempts;
    if v_attempts > (case when v_bucket='global' then 200 else 10 end) then
      return jsonb_build_object('outcome','RATE_LIMITED');
    end if;
  end loop;
  if p_payload->>'privacy_consent' is distinct from 'true' or char_length(btrim(p_payload->>'full_name')) not between 2 and 120
    or p_payload->>'mobile_number' !~ '^[+0-9() -]{7,20}$'
    or (coalesce(p_payload->>'email','') <> '' and (char_length(p_payload->>'email') > 254 or p_payload->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
    or char_length(coalesce(p_payload->>'message','')) > 1000 or char_length(coalesce(p_payload->>'purpose_of_stay','')) > 200
    or char_length(coalesce(p_payload->>'utm_source','')) > 100 or char_length(coalesce(p_payload->>'utm_medium','')) > 100 or char_length(coalesce(p_payload->>'utm_campaign','')) > 100
    or (p_payload->>'adults')::integer not between 1 and 8 or (p_payload->>'children')::integer not between 0 and 7
    or (p_payload->>'day_visitors')::integer not between 0 and 32767 or (p_payload->>'vehicles')::integer not between 0 and 32767
    or jsonb_typeof(p_payload->'folding_foams_requested') <> 'boolean' then raise check_violation; end if;
  v_from := (p_payload->>'check_in_date')::date; v_to := (p_payload->>'check_out_date')::date;
  if v_from is null or v_to is null or v_from < (now() at time zone 'Asia/Manila')::date
    or v_from > ((now() at time zone 'Asia/Manila')::date + interval '18 months')::date or v_to <= v_from or v_to-v_from > 366 then raise check_violation; end if;
  v_package := (p_payload->>'package_code')::public.booking_package_code;
  v_guests := (p_payload->>'adults')::integer + (p_payload->>'children')::integer;
  -- Stable rate publication and occupancy read at the transaction's acceptance point.
  perform ten29_private.lock_intake_rate_head(v_package);
  v_price := ten29_private.read_prices(v_package,v_from,v_to,v_guests,(p_payload->>'folding_foams_requested')::boolean);
  if v_price is distinct from p_payload->'reviewed_estimate' then
    return jsonb_build_object('outcome','PRICE_CHANGED','estimate',v_price);
  end if;
  perform pg_advisory_xact_lock_shared(421295);
  if exists(select 1 from public.property_occupancies where active and property_id=1
    and daterange(check_in_date,check_out_date,'[)') && daterange(v_from,v_to,'[)')) then
    return jsonb_build_object('outcome','UNAVAILABLE');
  end if;
  v_ref := 'TEN29-' || upper(replace(gen_random_uuid()::text,'-',''));
  insert into public.inquiries(reference_code,source,full_name,mobile_number,email,check_in_date,check_out_date,adults,children,day_visitors,vehicles,
    privacy_consent,message,purpose_of_stay,utm_source,utm_medium,utm_campaign)
  values(v_ref,'website',btrim(p_payload->>'full_name'),p_payload->>'mobile_number',nullif(p_payload->>'email',''),v_from,v_to,
    (p_payload->>'adults')::smallint,(p_payload->>'children')::smallint,(p_payload->>'day_visitors')::smallint,(p_payload->>'vehicles')::smallint,true,
    nullif(p_payload->>'message',''),nullif(p_payload->>'purpose_of_stay',''),nullif(p_payload->>'utm_source',''),nullif(p_payload->>'utm_medium',''),nullif(p_payload->>'utm_campaign','')) returning id into v_inquiry;
  insert into public.booking_requests(inquiry_id,source,package_code,check_in_date,check_out_date,overnight_guest_count,folding_foams_requested,created_by)
  values(v_inquiry,'WEBSITE',v_package,v_from,v_to,v_guests,(p_payload->>'folding_foams_requested')::boolean,null) returning id into v_request;
  insert into public.inquiry_audit_events(inquiry_id,event_type,new_value,actor) values(v_inquiry,'WEBSITE_BOOKING_REQUEST_SAVED','NEW','website_intake');
  insert into public.booking_notification_outbox(request_id,recipient_kind) values(v_request,'OWNER');
  if nullif(p_payload->>'email','') is not null then insert into public.booking_notification_outbox(request_id,recipient_kind) values(v_request,'GUEST'); end if;
  v_receipt := jsonb_build_object('outcome','SAVED','reference_code',v_ref,'package_code',v_package,'overnight_guest_count',v_guests,
    'folding_foams_requested',(p_payload->>'folding_foams_requested')::boolean,'check_in_date',v_from,'check_out_date',v_to,'estimate',v_price,'notification_status','PENDING');
  insert into public.website_booking_intakes(request_id,session_hash,idempotency_key,payload_hash,estimate,receipt) values(v_request,p_session,p_key,encode(sha256(convert_to(p_payload::text,'UTF8')),'hex'),v_price,v_receipt);
  return v_receipt || jsonb_build_object('request_id',v_request);
end; $$;
-- Temporary ownership-transfer permissions only for the migration role.
grant ten29_intake_writer to postgres;
grant create on schema ten29_private to ten29_intake_writer;
alter function ten29_private.accept_website_booking(jsonb,text,uuid,text) owner to ten29_intake_writer;
revoke create on schema ten29_private from ten29_intake_writer;
revoke ten29_intake_writer from postgres;
create function public.accept_website_booking(p_payload jsonb,p_session text,p_key uuid,p_abuse text) returns jsonb language sql security invoker set search_path='' as $$
  select ten29_private.accept_website_booking(p_payload,p_session,p_key,p_abuse); $$;
revoke all on function ten29_private.accept_website_booking(jsonb,text,uuid,text),public.accept_website_booking(jsonb,text,uuid,text) from public,anon,authenticated;
grant execute on function ten29_private.accept_website_booking(jsonb,text,uuid,text),public.accept_website_booking(jsonb,text,uuid,text) to service_role;

-- Service-only lease/finalization. A stable provider idempotency key identifies each task.
create function ten29_private.claim_notification(p_request uuid,p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_task public.booking_notification_outbox; v_inquiry public.inquiries; v_snapshot public.website_booking_intakes;
begin
  select * into v_task from public.booking_notification_outbox where request_id=p_request and recipient_kind=p_kind for update;
  if not found or v_task.status='SENT' or v_task.next_attempt_at>now() or v_task.lease_until>now()
    or v_task.first_attempt_at < now()-interval '23 hours' then return null; end if;
  update public.booking_notification_outbox set status='SENDING',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds',
    first_attempt_at=coalesce(first_attempt_at,now()) where id=v_task.id returning * into v_task;
  select i.* into v_inquiry from public.inquiries i join public.booking_requests b on b.inquiry_id=i.id where b.id=p_request;
  select * into v_snapshot from public.website_booking_intakes where request_id=p_request;
  return jsonb_build_object('task',to_jsonb(v_task),'inquiry',to_jsonb(v_inquiry),'receipt',v_snapshot.receipt);
end; $$;
create function ten29_private.finish_notification(p_task uuid,p_token uuid,p_sent boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_task public.booking_notification_outbox; v_inquiry uuid;
begin
  update public.booking_notification_outbox set status=case when p_sent then 'SENT' else 'FAILED' end,
    delivered_at=case when p_sent then now() else null end,lease_until=null,next_attempt_at=now()+interval '1 minute'
    where id=p_task and lease_token=p_token and status='SENDING' returning * into v_task;
  if not found then raise check_violation; end if;
  select inquiry_id into v_inquiry from public.booking_requests where id=v_task.request_id;
  if v_task.recipient_kind='OWNER' then update public.inquiries set notification_status=case when p_sent then 'SENT'::public.notification_status else 'FAILED'::public.notification_status end,
    notification_error=case when p_sent then null else 'Notification delivery failed; retry required.' end where id=v_inquiry; end if;
  insert into public.inquiry_audit_events(inquiry_id,event_type,actor) values(v_inquiry,case when p_sent then 'NOTIFICATION_SENT' else 'NOTIFICATION_FAILED' end,'notification_outbox');
end; $$;
create function public.claim_booking_notification(p_request uuid,p_kind text) returns jsonb language sql security invoker set search_path='' as $$ select ten29_private.claim_notification(p_request,p_kind); $$;
create function public.finish_booking_notification(p_task uuid,p_token uuid,p_sent boolean) returns void language sql security invoker set search_path='' as $$ select ten29_private.finish_notification(p_task,p_token,p_sent); $$;
revoke all on function ten29_private.claim_notification(uuid,text),ten29_private.finish_notification(uuid,uuid,boolean),public.claim_booking_notification(uuid,text),public.finish_booking_notification(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function ten29_private.claim_notification(uuid,text),ten29_private.finish_notification(uuid,uuid,boolean),public.claim_booking_notification(uuid,text),public.finish_booking_notification(uuid,uuid,boolean) to service_role;
