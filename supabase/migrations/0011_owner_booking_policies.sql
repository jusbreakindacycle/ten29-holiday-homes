-- Forward-only policy transition. Existing rows retain LEGACY counting and finances.
alter table public.property_packages
 add column maximum_countable_guests smallint generated always as (case code when 'WHOLE_HOME_1BR' then 3 when 'WHOLE_HOME_2BR' then 5 else 8 end) stored,
 add column security_deposit_centavos bigint generated always as (case code when 'WHOLE_HOME_1BR' then 150000 when 'WHOLE_HOME_2BR' then 180000 else 200000 end) stored;
alter table public.booking_requests
 add column policy_version text not null default 'LEGACY',
 add column adults_count smallint,
 add column older_children_count smallint,
 add column exempt_children_count smallint,
 add column countable_guest_count smallint,
 add column extra_guests_requested smallint,
 add column occupancy_owner_review boolean;
alter table public.booking_requests drop constraint booking_requests_overnight_guest_count_check,
 drop constraint booking_requests_package_capacity_check;
alter table public.booking_requests add constraint booking_requests_policy_counts check (
 (policy_version='LEGACY' and adults_count is null and older_children_count is null and exempt_children_count is null
  and countable_guest_count is null and extra_guests_requested is null and occupancy_owner_review is null
  and (overnight_guest_count is null or (overnight_guest_count between 1 and 8 and
   ((package_code='WHOLE_HOME_1BR' and overnight_guest_count<=2 and not folding_foams_requested)
   or (package_code='WHOLE_HOME_2BR' and overnight_guest_count<=4 and not folding_foams_requested)
   or (package_code='WHOLE_HOME_3BR' and (overnight_guest_count<=6 or folding_foams_requested))))))
 or (policy_version='TEN29-20261015-v1' and adults_count is not null and older_children_count is not null and exempt_children_count is not null
  and countable_guest_count is not null and overnight_guest_count is not null and extra_guests_requested is not null and occupancy_owner_review is not null
  and adults_count between 1 and 8 and older_children_count between 0 and 7 and exempt_children_count between 0 and 31
  and countable_guest_count=adults_count+older_children_count and overnight_guest_count=countable_guest_count+exempt_children_count
  and overnight_guest_count between 1 and 32 and countable_guest_count between 1 and
   case package_code when 'WHOLE_HOME_1BR' then 3 when 'WHOLE_HOME_2BR' then 5 else 8 end
  and extra_guests_requested=greatest(0,countable_guest_count-case package_code when 'WHOLE_HOME_1BR' then 2 when 'WHOLE_HOME_2BR' then 4 else 6 end)
  and occupancy_owner_review=(overnight_guest_count>8) and (extra_guests_requested=0 or folding_foams_requested)));
comment on column public.booking_requests.overnight_guest_count is 'Actual overnight headcount. LEGACY rows retain original uninterpreted counts; current counts include exempt children. 32 is an abuse input bound, not approved safety capacity.';
comment on column public.booking_properties.max_overnight_guests is 'Historical legacy ceiling. Current commercial eligibility uses countable guests; no new physical safety limit is asserted.';
grant insert(policy_version,adults_count,older_children_count,exempt_children_count,countable_guest_count,extra_guests_requested,occupancy_owner_review) on public.booking_requests to authenticated;

create table public.booking_policy_events (
 id uuid primary key default gen_random_uuid(), key uuid not null unique,
 request_id uuid not null references public.booking_requests(id),
 reservation_id uuid references public.booking_reservations(id), quote_id uuid references public.booking_quotes(id),
 type text not null, data jsonb not null, actor_id uuid not null references auth.users(id), created_at timestamptz not null default clock_timestamp()
);
create index policy_events_request on public.booking_policy_events(request_id,created_at,id);
create unique index security_verification_once on public.booking_policy_events((data->>'event_id')) where type='SECURITY_VERIFY';
create unique index reschedule_request_once on public.booking_policy_events(reservation_id) where type='RESCHEDULE_REQUEST';
create unique index security_refund_authorize_once on public.booking_policy_events(reservation_id) where type='SECURITY_REFUND_AUTHORIZE';
create unique index cancellation_review_once on public.booking_policy_events(reservation_id) where type='CANCELLATION_REVIEW';
create unique index quote_authorize_once on public.booking_policy_events(quote_id) where type='QUOTE_AUTHORIZE';
create unique index reschedule_review_once on public.booking_policy_events(reservation_id) where type='RESCHEDULE_REVIEW';
alter table public.booking_policy_events enable row level security;
revoke all on public.booking_policy_events from public,anon,authenticated,service_role;
grant select on public.booking_policy_events to authenticated;
create policy policy_owner_read on public.booking_policy_events for select to authenticated using(public.is_ten29_owner());
create trigger policy_events_immutable before update or delete on public.booking_policy_events for each row execute function ten29_private.reject_history_change();

create function ten29_private.policy_operation(p_id uuid,p_key uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare req public.booking_requests; stay public.booking_reservations; q public.booking_quotes;
 old_event public.booking_policy_events; event public.booking_policy_events; result uuid;
 t text:=p_data->>'type'; total bigint; sent bigint; refund bigint; allowed text[];
begin
 perform ten29_private.require_pricing_owner();
 if p_id is null or p_key is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>4096 then raise check_violation; end if;
 if t='RULES' then
  if (p_data-array['type','status','genuinely_evidenced'])<>'{}'::jsonb or p_data->>'genuinely_evidenced' is distinct from 'true' then raise check_violation; end if;
  p_data:=p_data-'genuinely_evidenced';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,11));
 select * into old_event from public.booking_policy_events where key=p_key;
 if found then
  if old_event.actor_id=auth.uid() and old_event.data=p_data-'type' and old_event.type=t
   and p_id=coalesce(old_event.quote_id,old_event.reservation_id,old_event.request_id) then return old_event.id; end if;
  raise check_violation using message='Policy operation key conflict';
 end if;
 if t='EXTRA_APPROVE' then select * into req from public.booking_requests where id=p_id for update;
 elsif t='QUOTE_AUTHORIZE' then
  select * into q from public.booking_quotes where id=p_id;
  select * into req from public.booking_requests where id=q.request_id for update;
 else
  select * into stay from public.booking_reservations where id=p_id;
  select * into req from public.booking_requests where id=stay.request_id for update;
 end if;
 if req.id is null then raise check_violation using message='Policy reference not found'; end if;
 if t='EXTRA_APPROVE' then
  allowed:=array['type','count','occupancy_reviewed'];
  if req.policy_version='LEGACY' or exists(select 1 from public.booking_reservations where request_id=req.id)
   or req.status not in ('NEW','REVIEWING','QUOTED','AWAITING_DEPOSIT')
   or p_data->>'occupancy_reviewed' is distinct from 'true' or (p_data->>'count')::integer is distinct from req.extra_guests_requested then raise check_violation; end if;
 elsif t='QUOTE_AUTHORIZE' then
  allowed:=array['type','basis_approved','terms_communicated','boundary_reviewed'];
  if q.status<>'DRAFT' or req.policy_version='LEGACY' or p_data->>'basis_approved' is distinct from 'true'
   or p_data->>'terms_communicated' is distinct from 'true' or p_data->>'boundary_reviewed' is distinct from 'true' then raise check_violation; end if;
 elsif t='SECURITY_RECORD' then
  allowed:=array['type','amount_centavos','method','occurred_at'];
  if exists(select 1 from public.booking_policy_events where reservation_id=stay.id and type='SECURITY_REFUND_AUTHORIZE') then raise check_violation; end if;
  if coalesce(p_data->>'method','') not in ('BANK_TRANSFER','GCASH') or coalesce(p_data->>'amount_centavos','') !~ '^[0-9]{1,12}$'
   or (p_data->>'amount_centavos')::bigint<=0 then raise check_violation; end if;
 elsif t='SECURITY_VERIFY' then
  allowed:=array['type','event_id','independent'];
  select * into event from public.booking_policy_events where id=(p_data->>'event_id')::uuid and reservation_id=stay.id and type='SECURITY_RECORD';
  if event.id is null or p_data->>'independent' is distinct from 'true' then raise check_violation; end if;
 elsif t='INSPECTION' then
  allowed:=array['type','status'];
  if (clock_timestamp() at time zone 'Asia/Manila')<stay.check_out_date::timestamp+interval '12 hours'
   or coalesce(p_data->>'status','') not in ('PASSED','DEDUCTIONS_REVIEW') then raise check_violation; end if;
 elsif t in ('SECURITY_REFUND_AUTHORIZE','SECURITY_REFUND_SENT') then
  select coalesce(sum((e.data->>'amount_centavos')::bigint),0) into total from public.booking_policy_events e
   where e.reservation_id=stay.id and e.type='SECURITY_RECORD' and exists(select 1 from public.booking_policy_events v where v.type='SECURITY_VERIFY' and v.data->>'event_id'=e.id::text);
  if t='SECURITY_REFUND_AUTHORIZE' then
   allowed:=array['type','deduction_centavos','reason','refund_centavos'];
   if coalesce(p_data->>'deduction_centavos','') !~ '^[0-9]{1,12}$' or coalesce(p_data->>'refund_centavos','') !~ '^[0-9]{1,12}$'
    or coalesce(p_data->>'reason','') not in ('PROPERTY_DAMAGE','EXCESS_CLEANING','OWNER_EXCEPTION')
    or not exists(select 1 from public.booking_policy_events where reservation_id=stay.id and type='INSPECTION') then raise check_violation; end if;
   if (p_data->>'deduction_centavos')::bigint+(p_data->>'refund_centavos')::bigint<>total then raise check_violation; end if;
  else
   allowed:=array['type','amount_centavos','independent','occurred_at'];
   select (data->>'refund_centavos')::bigint into refund from public.booking_policy_events where reservation_id=stay.id and type='SECURITY_REFUND_AUTHORIZE';
   select coalesce(sum((data->>'amount_centavos')::bigint),0) into sent from public.booking_policy_events where reservation_id=stay.id and type=t;
   if refund is null or p_data->>'independent' is distinct from 'true' or coalesce(p_data->>'amount_centavos','') !~ '^[0-9]{1,12}$'
    or (p_data->>'amount_centavos')::bigint<=0 or sent+(p_data->>'amount_centavos')::bigint>refund then raise check_violation; end if;
  end if;
 elsif t='RULES' then
  allowed:=array['type','status'];
  if coalesce(p_data->>'status','') not in ('NOT_SENT','SENT_EXTERNALLY','ACKNOWLEDGED_BY_GUEST','NEEDS_FOLLOW_UP')
   or exists(select 1 from public.booking_operation_events where reservation_id=stay.id and action in ('CANCEL','COMPLETE')) then raise check_violation; end if;
  select * into q from public.booking_quotes where id=stay.quote_id;
  select coalesce(sum(d.amount),0)*100 into total from public.booking_deposits d join public.booking_deposit_verifications v on v.deposit_id=d.id and v.decision='VERIFIED' and v.independently_verified where d.request_id=req.id;
  if q.required_deposit_amount is null or q.required_deposit_amount<=0 or total<q.required_deposit_amount*100 then raise check_violation; end if;
  if p_data->>'status'='ACKNOWLEDGED_BY_GUEST' and not exists(select 1 from public.booking_policy_events where reservation_id=stay.id and type='RULES' and data->>'status'='SENT_EXTERNALLY') then raise check_violation; end if;
  -- Strict metadata-only event: no payload, digest, attachments or evidence text.
  p_data:=jsonb_build_object('type','RULES','status',p_data->>'status'); allowed:=array['type','status'];
 elsif t='RESCHEDULE_REQUEST' then
  allowed:=array['type','check_in_date','check_out_date'];
  if exists(select 1 from public.booking_operation_events where reservation_id=stay.id and action in ('CANCEL','COMPLETE'))
   or (p_data->>'check_in_date')::date is null or (p_data->>'check_out_date')::date is null
   or (p_data->>'check_out_date')::date-(p_data->>'check_in_date')::date not between 1 and 366 then raise check_violation; end if;
 elsif t='RESCHEDULE_REVIEW' then
  allowed:=array['type','decision'];
  if coalesce(p_data->>'decision','') not in ('DECLINED','REQUIRES_OWNER_FINANCIAL_DECISION') or not exists(select 1 from public.booking_policy_events where reservation_id=stay.id and type='RESCHEDULE_REQUEST') then raise check_violation; end if;
 elsif t='CANCELLATION_REVIEW' then
  allowed:=array['type','request_date','classification','refund_centavos','forfeit_centavos','credit_centavos','credit_start','credit_end','processing_centavos','basis','final'];
  if not exists(select 1 from public.booking_operation_events where reservation_id=stay.id and action='CANCEL')
   or p_data->>'final' is distinct from 'true' or coalesce(p_data->>'classification','') not in ('NORMAL','SAME_DAY','NO_SHOW','OWNER_EXCEPTION')
   or coalesce(p_data->>'basis','') not in ('VERIFIED_ACCOMMODATION','OWNER_EXCEPTION') then raise check_violation; end if;
  if coalesce(p_data->>'refund_centavos','') !~ '^[0-9]{1,12}$' or coalesce(p_data->>'forfeit_centavos','') !~ '^[0-9]{1,12}$'
   or coalesce(p_data->>'credit_centavos','') !~ '^[0-9]{1,12}$' or coalesce(p_data->>'processing_centavos','') !~ '^[0-9]{1,12}$' then raise check_violation; end if;
  select coalesce(sum(d.amount),0)*100 into total from public.booking_deposits d join public.booking_deposit_verifications v on v.deposit_id=d.id and v.decision='VERIFIED' and v.independently_verified where d.request_id=req.id;
  if (p_data->>'refund_centavos')::bigint+(p_data->>'forfeit_centavos')::bigint+(p_data->>'credit_centavos')::bigint+(p_data->>'processing_centavos')::bigint<>total then raise check_violation; end if;
  if (p_data->>'credit_centavos')::bigint>0 and ((p_data->>'credit_start')::date is null or (p_data->>'credit_end')::date is null or (p_data->>'credit_end')::date<=(p_data->>'credit_start')::date) then raise check_violation; end if;
 elsif t='ACCOMMODATION_REFUND_SENT' then
  allowed:=array['type','amount_centavos','independent','occurred_at'];
  select (data->>'refund_centavos')::bigint into refund from public.booking_policy_events where reservation_id=stay.id and type='CANCELLATION_REVIEW';
  select coalesce(sum((data->>'amount_centavos')::bigint),0) into sent from public.booking_policy_events where reservation_id=stay.id and type=t;
  if refund is null or coalesce(p_data->>'amount_centavos','') !~ '^[0-9]{1,12}$' or p_data->>'independent' is distinct from 'true'
   or (p_data->>'amount_centavos')::bigint<=0 or sent+(p_data->>'amount_centavos')::bigint>refund then raise check_violation; end if;
 else raise check_violation using message='Unsupported policy operation'; end if;
 if p_data ? 'occurred_at' and (jsonb_typeof(p_data->'occurred_at')<>'string' or (p_data->>'occurred_at')::timestamptz>clock_timestamp()) then raise check_violation using message='Actual payment date must not be in the future'; end if;
 if p_data ? 'request_date' and (jsonb_typeof(p_data->'request_date')<>'string' or (p_data->>'request_date')::date>(clock_timestamp() at time zone 'Asia/Manila')::date) then raise check_violation; end if;
 if (p_data-allowed)<>'{}'::jsonb then raise check_violation using message='Unexpected policy fields'; end if;
 insert into public.booking_policy_events(key,request_id,reservation_id,quote_id,type,data,actor_id)
 values(p_key,req.id,stay.id,case when t='QUOTE_AUTHORIZE' then q.id end,t,p_data-'type',auth.uid()) returning id into result;
 return result;
end $$;
create function public.perform_booking_policy_operation(p_id uuid,p_key uuid,p_data jsonb) returns uuid
language sql security invoker set search_path='' as $$ select ten29_private.policy_operation(p_id,p_key,p_data); $$;
revoke all on function ten29_private.policy_operation(uuid,uuid,jsonb),public.perform_booking_policy_operation(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function ten29_private.policy_operation(uuid,uuid,jsonb),public.perform_booking_policy_operation(uuid,uuid,jsonb) to authenticated;


-- Extended existing transaction implementations; unchanged public RPC signatures.
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

  if tg_op='UPDATE' and (new.policy_version,new.adults_count,new.older_children_count,new.exempt_children_count,new.countable_guest_count,new.extra_guests_requested,new.occupancy_owner_review)
    is distinct from (old.policy_version,old.adults_count,old.older_children_count,old.exempt_children_count,old.countable_guest_count,old.extra_guests_requested,old.occupancy_owner_review) then
    raise check_violation using message='Occupancy policy snapshot is immutable';
  end if;
  if new.policy_version='TEN29-20261015-v1' then return new; end if;
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

create or replace function ten29_private.read_prices(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_revision uuid; v_nights jsonb; v_total bigint; v_missing boolean; v_cap integer; v_rooms integer;
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then raise check_violation using message='Price window must be between 1 and 366 nights'; end if;
 select max_guests,bedrooms_access into v_cap,v_rooms from public.property_packages where code=p_package;
 if v_cap is null or p_guests is null or p_guests<1 or p_guests>8 or p_foams is null
  or p_guests>(case p_package when 'WHOLE_HOME_1BR' then 3 when 'WHOLE_HOME_2BR' then 5 else 8 end)
  or (p_guests>v_cap and not p_foams) then raise check_violation using message='Ineligible package occupancy'; end if;
 select published_revision_id into v_revision from public.calendar_rate_heads where package_code=p_package;
 select jsonb_agg(jsonb_build_object('date',d,'package_code',p_package,'amount_centavos',r.amount_centavos,
  'source',coalesce(r.source,'MISSING'),'rate_revision_id',v_revision) order by d),
  bool_or(r.amount_centavos is null),sum(r.amount_centavos)::bigint into v_nights,v_missing,v_total
 from (select p_from+i as d from generate_series(0,p_to-p_from-1) i) days
 left join lateral ten29_private.resolve_rate(v_revision,d) r on true;
 return jsonb_build_object('package_code',p_package,'bedrooms_opened',v_rooms,'private_whole_house',true,
  'check_in_date',p_from,'check_out_date',p_to,'overnight_guest_count',p_guests,'folding_foams_requested',p_foams,
  'version',v_revision,'nights',v_nights,'missing_rates',v_missing,
  'accommodation_subtotal_centavos',case when v_missing then null else v_total end,
  'estimated_total_centavos',case when v_missing then null else v_total end,'estimate_kind','ACCOMMODATION_ONLY','currency','PHP');
end $$;

-- Temporarily regain membership only to replace the existing least-privilege-owned intake.
grant ten29_intake_writer to postgres;
create or replace function ten29_private.accept_website_booking(p_payload jsonb,p_session text,p_key uuid,p_abuse text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_existing public.website_booking_intakes; v_inquiry uuid; v_request uuid; v_ref text; v_price jsonb; v_receipt jsonb;
  v_from date; v_to date; v_package public.booking_package_code; v_guests integer; v_bucket text; v_attempts integer; v_current boolean; v_young integer:=0; v_actual integer;
begin
  if p_session is null or p_session !~ '^[a-f0-9]{64}$' or p_abuse is null or p_abuse !~ '^[a-f0-9]{64}$' or p_key is null
    or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 131072 then raise check_violation; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('full_name','mobile_number','email','adults','children','young_children','policy_version','day_visitors','vehicles',
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
  v_current:=p_payload->>'policy_version'='TEN29-20261015-v1';
  if p_payload ? 'policy_version' and not coalesce(v_current,false) then raise check_violation; end if;
  if p_payload ? 'young_children' and not coalesce(v_current,false) then raise check_violation; end if;
  if v_current then
    if coalesce(p_payload->>'young_children','') !~ '^[0-9]{1,2}$' or (p_payload->>'young_children')::integer not between 0 and 31 then raise check_violation; end if;
    v_young:=(p_payload->>'young_children')::integer;
  end if;
  v_from := (p_payload->>'check_in_date')::date; v_to := (p_payload->>'check_out_date')::date;
  if v_from is null or v_to is null or v_from < (now() at time zone 'Asia/Manila')::date
    or v_from > ((now() at time zone 'Asia/Manila')::date + interval '18 months')::date or v_to <= v_from or v_to-v_from > 366 then raise check_violation; end if;
  v_package := (p_payload->>'package_code')::public.booking_package_code;
  v_guests := (p_payload->>'adults')::integer + (p_payload->>'children')::integer;
  v_actual:=v_guests+v_young;
  if v_actual>32 then raise check_violation; end if;
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
    (p_payload->>'adults')::smallint,((p_payload->>'children')::integer+v_young)::smallint,(p_payload->>'day_visitors')::smallint,(p_payload->>'vehicles')::smallint,true,
    nullif(p_payload->>'message',''),nullif(p_payload->>'purpose_of_stay',''),nullif(p_payload->>'utm_source',''),nullif(p_payload->>'utm_medium',''),nullif(p_payload->>'utm_campaign','')) returning id into v_inquiry;
  insert into public.booking_requests(inquiry_id,source,package_code,check_in_date,check_out_date,overnight_guest_count,folding_foams_requested,created_by,policy_version,adults_count,older_children_count,exempt_children_count,countable_guest_count,extra_guests_requested,occupancy_owner_review)
  values(v_inquiry,'WEBSITE',v_package,v_from,v_to,v_actual,(p_payload->>'folding_foams_requested')::boolean,null,
    case when v_current then 'TEN29-20261015-v1' else 'LEGACY' end,
    case when v_current then (p_payload->>'adults')::smallint end,case when v_current then (p_payload->>'children')::smallint end,
    case when v_current then v_young end,case when v_current then v_guests end,
    case when v_current then greatest(0,v_guests-case v_package when 'WHOLE_HOME_1BR' then 2 when 'WHOLE_HOME_2BR' then 4 else 6 end) end,
    case when v_current then v_actual>8 end) returning id into v_request;
  insert into public.inquiry_audit_events(inquiry_id,event_type,new_value,actor) values(v_inquiry,'WEBSITE_BOOKING_REQUEST_SAVED','NEW','website_intake');
  insert into public.booking_notification_outbox(request_id,recipient_kind) values(v_request,'OWNER');
  if nullif(p_payload->>'email','') is not null then insert into public.booking_notification_outbox(request_id,recipient_kind) values(v_request,'GUEST'); end if;
  v_receipt := jsonb_build_object('outcome','SAVED','reference_code',v_ref,'package_code',v_package,'overnight_guest_count',v_actual,
    'folding_foams_requested',(p_payload->>'folding_foams_requested')::boolean,'check_in_date',v_from,'check_out_date',v_to,'estimate',v_price,'notification_status','PENDING');
  insert into public.website_booking_intakes(request_id,session_hash,idempotency_key,payload_hash,estimate,receipt) values(v_request,p_session,p_key,encode(sha256(convert_to(p_payload::text,'UTF8')),'hex'),v_price,v_receipt);
  return v_receipt || jsonb_build_object('request_id',v_request);
end; $$;

revoke ten29_intake_writer from postgres;

create or replace function ten29_private.booking_operation(p_action text,p_id uuid,p_key uuid,p_data jsonb) returns uuid
 language plpgsql security definer set search_path='' as $$
declare old_event public.booking_operation_events; req public.booking_requests; stay public.booking_reservations;
 result uuid; payload jsonb; event_request uuid; event_reservation uuid; occ uuid; payment_review boolean:=false;
begin
 if not public.is_ten29_admin() then raise insufficient_privilege using message='TEN29 access required'; end if;
 if p_action is null or p_key is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16384
  or p_action not in ('MANUAL','STATUS','PAYMENT','CANCEL','COMPLETE','NOTIFY_RETRY','NOTE') then raise check_violation using message='Invalid operation'; end if;
 if p_action in ('CANCEL','COMPLETE') and not public.is_ten29_owner() then raise insufficient_privilege using message='OWNER required'; end if;
 payload:=jsonb_build_object('action',p_action,'id',p_id,'data',p_data);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text,7));
 select * into old_event from public.booking_operation_events where key=p_key;
 if found then
  if old_event.input=jsonb_build_object('digest',encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex')) and old_event.actor_id=auth.uid() then return old_event.result_id; end if;
  raise check_violation using message='Operation key conflict';
 end if;
 if p_action='MANUAL' then
  if p_id is not null or (p_data-array['source','package_code','check_in_date','check_out_date','overnight_guest_count','folding_foams_requested','full_name','contact_number','email','notes','policy_version','adults_count','older_children_count','exempt_children_count'])<>'{}'
   or coalesce(p_data->>'source','') not in ('MESSENGER','PHONE','WALK_IN','EXTERNAL_PLATFORM','OTHER')
   or coalesce(char_length(btrim(p_data->>'full_name')),0) not between 1 and 120
   or coalesce(char_length(btrim(p_data->>'contact_number')),0) not between 5 and 40
   or coalesce(char_length(p_data->>'notes'),0)>2000
   or (p_data->>'check_out_date')::date-(p_data->>'check_in_date')::date>366 then raise check_violation using message='Invalid manual request'; end if;
  insert into public.booking_requests(idempotency_key,source,package_code,check_in_date,check_out_date,overnight_guest_count,folding_foams_requested,policy_version,adults_count,older_children_count,exempt_children_count,countable_guest_count,extra_guests_requested,occupancy_owner_review)
   values(p_key,(p_data->>'source')::public.booking_request_source,(p_data->>'package_code')::public.booking_package_code,
    (p_data->>'check_in_date')::date,(p_data->>'check_out_date')::date,(p_data->>'overnight_guest_count')::smallint,
    (p_data->>'folding_foams_requested')::boolean,coalesce(p_data->>'policy_version','LEGACY'),
    (p_data->>'adults_count')::smallint,(p_data->>'older_children_count')::smallint,(p_data->>'exempt_children_count')::smallint,
    case when p_data->>'policy_version'='TEN29-20261015-v1' then (p_data->>'adults_count')::integer+(p_data->>'older_children_count')::integer end,
    case when p_data->>'policy_version'='TEN29-20261015-v1' then greatest(0,(p_data->>'adults_count')::integer+(p_data->>'older_children_count')::integer-case (p_data->>'package_code') when 'WHOLE_HOME_1BR' then 2 when 'WHOLE_HOME_2BR' then 4 else 6 end) end,
    case when p_data->>'policy_version'='TEN29-20261015-v1' then (p_data->>'overnight_guest_count')::integer>8 end) returning id into result;
  insert into public.manual_booking_contacts(request_id,full_name,contact_number,email,notes,created_by)
   values(result,btrim(p_data->>'full_name'),btrim(p_data->>'contact_number'),nullif(btrim(p_data->>'email'),''),coalesce(p_data->>'notes',''),auth.uid());
  event_request:=result;
 elsif p_action in ('STATUS','PAYMENT','NOTIFY_RETRY','NOTE') then
  select * into req from public.booking_requests where id=p_id for update;
  if not found then raise check_violation using message='Request not found'; end if;
  event_request:=req.id;
  if p_action='NOTE' then
   if (p_data-array['text'])<>'{}'::jsonb or coalesce(char_length(btrim(p_data->>'text')),0) not between 1 and 500 then raise check_violation using message='Invalid operational note'; end if;
   result:=req.id;
  elsif p_action='NOTIFY_RETRY' then
   if p_data<>'{}'::jsonb then raise check_violation using message='Invalid retry'; end if;
   result:=req.id;
  elsif p_action='STATUS' then
   if (p_data-array['status','expected_status'])<>'{}' or req.status::text is distinct from p_data->>'expected_status' then
    raise check_violation using message='Request changed; reload'; end if;
   update public.booking_requests set status=(p_data->>'status')::public.booking_request_status where id=req.id;
   payment_review:=(p_data->>'status') in ('DECLINED','WITHDRAWN','EXPIRED') and exists(select 1 from public.booking_deposits d left join public.booking_deposit_verifications v on v.deposit_id=d.id where d.request_id=req.id and coalesce(v.decision,'RECORDED_UNVERIFIED')<>'REJECTED');
   result:=req.id;
  else
   if exists(select 1 from public.booking_operation_events where request_id=req.id and action in ('CANCEL','COMPLETE')) then raise check_violation using message='Stay is closed'; end if;
   if req.policy_version<>'LEGACY' and coalesce(p_data->>'payment_method','') not in ('BANK_TRANSFER','GCASH') then raise check_violation; end if;
   if (p_data-array['amount_centavos','payment_method','masked_reference'])<>'{}'
    or coalesce(p_data->>'amount_centavos','') !~ '^[0-9]{1,9}$' or (p_data->>'amount_centavos')::bigint<1
    or coalesce(char_length(p_data->>'payment_method'),0)>40 or coalesce(char_length(p_data->>'masked_reference'),0)>80
    or coalesce(p_data->>'masked_reference','') ~ '[0-9]{5,}' then raise check_violation using message='Invalid unverified payment'; end if;
   insert into public.booking_deposits(idempotency_key,request_id,amount,payment_method,external_reference_masked)
    values(p_key,req.id,(p_data->>'amount_centavos')::numeric/100,nullif(p_data->>'payment_method',''),nullif(p_data->>'masked_reference','')) returning id into result;
  end if;
 else
  if (p_data-array['reason','refund_review_acknowledged'])<>'{}' or coalesce(char_length(btrim(p_data->>'reason')),0) not between 1 and 500
   or (p_action='CANCEL' and coalesce((p_data->>'refund_review_acknowledged')::boolean,false) is not true) then raise check_violation using message='Reason and payment review acknowledgement required'; end if;
  -- Lock order matches confirmation: request before reservation/occupancy.
  select request_id into event_request from public.booking_reservations where id=p_id;
  perform 1 from public.booking_requests where id=event_request for update;
  select * into stay from public.booking_reservations where id=p_id for update;
  if not found or stay.status<>'CONFIRMED' or exists(select 1 from public.booking_operation_events where reservation_id=p_id and action in ('CANCEL','COMPLETE')) then
   raise check_violation using message='Reservation is not active'; end if;
  if p_action='COMPLETE' and (clock_timestamp() at time zone 'Asia/Manila') < stay.check_out_date::timestamp + interval '12 hours' then
   raise check_violation using message='Stay cannot be completed before checkout'; end if;
  event_reservation:=stay.id; result:=stay.id;
  if p_action='CANCEL' then
   select id into occ from public.property_occupancies where reservation_id=stay.id and active for update;
   if not found then raise check_violation using message='Reservation occupancy missing'; end if;
   update public.property_occupancies set active=false where id=occ;
   insert into public.property_occupancy_events(occupancy_id,event,actor_id) values(occ,'RELEASED',auth.uid());
  end if;
  insert into public.booking_reservation_events(reservation_id,previous_status,new_status,actor_id)
   values(stay.id,'CONFIRMED',case when p_action='CANCEL' then 'CANCELLED'::public.reservation_status else 'COMPLETED'::public.reservation_status end,auth.uid());
 end if;
 insert into public.booking_operation_events(key,request_id,reservation_id,action,input,result_id,reason,refund_review_required,actor_id)
 values(p_key,event_request,event_reservation,p_action,
 -- PII lives only in the protected contact record; bind retry payload with digest.
 jsonb_build_object('digest',encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex')),result,coalesce(p_data->>'reason',p_data->>'text',''),p_action='CANCEL' or payment_review,auth.uid());
 return result;
end $$;

create or replace function ten29_private.prepare_priced_quote(p_request uuid,p_expected_rate uuid,p_deposit bigint,p_adjustments jsonb,
 p_manual_nights jsonb,p_security_deposit bigint,p_conditions text,p_valid_until timestamptz,p_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare req public.booking_requests; prices jsonb; night jsonb; manual jsonb; adj jsonb; items jsonb:='[]'; adjustments jsonb:='[]';
 subtotal bigint:=0; charges bigint:=0; discounts bigint:=0; line bigint; amount bigint; v_source text; v_id uuid; v_revision integer;
 v_snapshot jsonb; existing public.booking_quotes; current_rate uuid; n integer; saved_input jsonb; approval public.booking_policy_events; notice integer; proposed bigint; schedule jsonb; policy_snapshot jsonb;
begin
 perform ten29_private.require_pricing_owner();
 if p_key is null or p_deposit<0 or p_deposit>999999999999 or p_security_deposit<0 or p_security_deposit>999999999999
  or char_length(p_conditions)>500 or (p_valid_until is not null and p_valid_until<=clock_timestamp())
  or p_adjustments is null or jsonb_typeof(p_adjustments)<>'array' or jsonb_array_length(p_adjustments)>50
  or p_manual_nights is null or jsonb_typeof(p_manual_nights)<>'array' or jsonb_array_length(p_manual_nights)>366 then
  raise check_violation using message='Invalid quotation inputs';
 end if;
 select * into req from public.booking_requests where id=p_request for update;
 if not found then raise check_violation using message='Booking request not found'; end if;
 saved_input:=jsonb_build_object('request_id',p_request,'expected_rate',p_expected_rate,'deposit',p_deposit,
  'adjustments',p_adjustments,'manual_nights',p_manual_nights,'security_deposit',p_security_deposit,'conditions',p_conditions,'valid_until',p_valid_until);
 select * into existing from public.booking_quotes where idempotency_key=p_key;
 if found then
  if (select breakdown->'owner_input' from public.booking_quote_pricing_snapshots where quote_id=existing.id)=saved_input then return existing.id; end if;
  raise check_violation using message='Idempotency key was already used';
 end if;
 if req.status not in ('REVIEWING','QUOTED','AWAITING_DEPOSIT') or exists(select 1 from public.booking_reservations where request_id=p_request) then
  raise check_violation using message='Request is not eligible for a new quote';
 end if;
 select published_revision_id into current_rate from public.calendar_rate_heads where package_code=req.package_code for share;
 if current_rate is distinct from p_expected_rate then raise check_violation using message='Rates changed; review the current estimate'; end if;
 prices:=ten29_private.read_prices(req.package_code,req.check_in_date,req.check_out_date,coalesce(req.countable_guest_count,req.overnight_guest_count),req.folding_foams_requested);
 for manual in select value from jsonb_array_elements(p_manual_nights) loop
  if jsonb_typeof(manual)<>'object' or (manual-array['date','amount_centavos','reason'])<>'{}'::jsonb
   or coalesce(manual->>'amount_centavos','') !~ '^[0-9]{1,9}$'
   or coalesce(char_length(btrim(manual->>'reason')),0) not between 1 and 200
   or coalesce(manual->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
   or (manual->>'date')::date<req.check_in_date or (manual->>'date')::date>=req.check_out_date then
   raise check_violation using message='Manual nightly prices require an in-stay date and owner reason';
  end if;
 end loop;
 if (select count(*)<>count(distinct value->>'date') from jsonb_array_elements(p_manual_nights)) then raise check_violation using message='Duplicate manual night'; end if;
 for night in select value from jsonb_array_elements(prices->'nights') loop
  select value into manual from jsonb_array_elements(p_manual_nights) where value->>'date'=night->>'date';
  if found then
   amount:=(manual->>'amount_centavos')::bigint;
   night:=night||jsonb_build_object('amount_centavos',amount,'source','OWNER_MANUAL','rate_revision_id',null,
    'reason',manual->>'reason','approved_by',auth.uid(),'approved_at',clock_timestamp());
  else amount:=(night->>'amount_centavos')::bigint;
  end if;
  if amount is null then raise check_violation using message='Missing nightly rate; request an owner quote'; end if;
  subtotal:=subtotal+amount; items:=items||jsonb_build_array(night);
 end loop;
 if req.policy_version<>'LEGACY' then
  if exists(select 1 from jsonb_array_elements(p_adjustments) a where lower(coalesce(a->>'description','')||' '||coalesce(a->>'reason','')) ~ '(extra|additional|foam|linen|towel|dental|slipper|guest)') then
   raise check_violation using message='Use the authoritative extra-guest approval path'; end if;
  select * into approval from public.booking_policy_events where request_id=req.id and type='EXTRA_APPROVE' order by created_at desc,id desc limit 1;
  if (req.extra_guests_requested>0 or req.occupancy_owner_review) and (approval.id is null or (approval.data->>'count')::integer<>req.extra_guests_requested) then raise check_violation using message='OWNER occupancy approval required'; end if;
  if req.extra_guests_requested>0 then
   line:=req.extra_guests_requested*40000::bigint*(req.check_out_date-req.check_in_date); charges:=charges+line;
   adjustments:=adjustments||jsonb_build_array(jsonb_build_object('type','CHARGE','description','OWNER-approved additional guests','quantity',req.extra_guests_requested,
    'unit_amount_centavos',40000,'nights',req.check_out_date-req.check_in_date,'reason','OWNER extra-guest approval','line_total_centavos',line,'status','APPROVED','approved_by',approval.actor_id,'approved_at',approval.created_at));
  end if;
 end if;
 for adj in select value from jsonb_array_elements(p_adjustments) loop
  if jsonb_typeof(adj)<>'object' or (adj-array['type','description','quantity','unit_amount_centavos','reason'])<>'{}'::jsonb
   or coalesce(adj->>'type','') not in ('CHARGE','DISCOUNT')
   or coalesce(char_length(btrim(adj->>'description')),0) not between 1 and 160
   or coalesce(char_length(btrim(adj->>'reason')),0) not between 1 and 200
   or coalesce(adj->>'quantity','') !~ '^[0-9]{1,4}$' or (adj->>'quantity')::integer not between 1 and 1000
   or coalesce(adj->>'unit_amount_centavos','') !~ '^[0-9]{1,9}$' then raise check_violation using message='Invalid owner adjustment'; end if;
  line:=(adj->>'quantity')::bigint*(adj->>'unit_amount_centavos')::bigint;
  if adj->>'type'='DISCOUNT' then discounts:=discounts+line; line:=-line; else charges:=charges+line; end if;
  adjustments:=adjustments||jsonb_build_array(adj||jsonb_build_object('line_total_centavos',line,'status','APPROVED','approved_by',auth.uid(),'approved_at',clock_timestamp()));
 end loop;
 amount:=subtotal+charges-discounts;
 if amount<0 or amount>999999999999 or p_deposit>amount then raise check_violation using message='Invalid final quotation total or required deposit'; end if;
 if req.policy_version<>'LEGACY' then
  notice:=req.check_in_date-(clock_timestamp() at time zone 'Asia/Manila')::date;
  proposed:=case when notice<=7 then amount else (amount*30+50)/100 end;
  p_deposit:=coalesce(p_deposit,proposed);
  if (notice<7 and p_deposit<>amount) or (notice>7 and p_deposit<>(amount*30+50)/100)
   or (notice=7 and p_deposit not in (amount,(amount*30+50)/100)) then raise check_violation using message='Review required payment schedule'; end if;
  p_security_deposit:=case req.package_code when 'WHOLE_HOME_1BR' then 150000 when 'WHOLE_HOME_2BR' then 180000 else 200000 end;
  schedule:=jsonb_build_object('basis','PROPOSED_FINAL_ACCOMMODATION_EXCLUDING_SECURITY','mode',case when p_deposit=amount then 'FULL_PAYMENT' else 'STANDARD_30_70' end,
   'notice_days',notice,'boundary_review_required',notice=7,'required_down_payment_centavos',p_deposit,'remaining_required_centavos',amount-p_deposit,
   'balance_due_date',req.check_in_date-7,'refundable_security_deposit_centavos',p_security_deposit,'conditions',p_conditions);
  policy_snapshot:=jsonb_build_object('version',req.policy_version,'effective_date','2026-10-15','countable',req.countable_guest_count,'exempt_children',req.exempt_children_count,
   'actual_occupants',req.overnight_guest_count,'extra_requested',req.extra_guests_requested,'extra_approved',req.extra_guests_requested,'extra_approval_event',approval.id,
   'extra_rate_centavos',40000,'extra_nights',req.check_out_date-req.check_in_date,'extra_total_centavos',req.extra_guests_requested*40000::bigint*(req.check_out_date-req.check_in_date));
 end if;
 select coalesce(max(revision),0)+1 into v_revision from public.booking_quotes where request_id=p_request;
 n:=req.check_out_date-req.check_in_date;
 v_snapshot:=jsonb_build_object('schema_version',1,'currency','PHP','owner_input',saved_input,
  'booking',jsonb_build_object('reference',coalesce((select reference_code from public.inquiries where id=req.inquiry_id),req.id::text),
   'request_id',req.id,'guest_count',req.overnight_guest_count,'package_code',req.package_code,
   'bedrooms_opened',(select bedrooms_access from public.property_packages where code=req.package_code),
   'check_in_date',req.check_in_date,'check_out_date',req.check_out_date,'nights',n),
  'accommodation',jsonb_build_object('nights',items,'subtotal_centavos',subtotal),
  'adjustments',adjustments,'additional_charges_centavos',charges,'discounts_centavos',discounts,
  'adjustment_total_centavos',charges-discounts,'final_total_centavos',amount,
  'payment',jsonb_build_object('required_down_payment_centavos',p_deposit,'refundable_security_deposit_centavos',p_security_deposit,'conditions',p_conditions));
 if req.policy_version<>'LEGACY' then v_snapshot:=v_snapshot||jsonb_build_object('policy',policy_snapshot,'payment',schedule); end if;
 insert into public.booking_quotes(idempotency_key,request_id,revision,amount_total,required_deposit_amount,valid_until,line_items)
 values(p_key,p_request,v_revision,amount::numeric/100,p_deposit::numeric/100,p_valid_until,items) returning id into v_id;
 insert into public.booking_quote_pricing_snapshots(quote_id,breakdown,created_by) values(v_id,v_snapshot,auth.uid());
 return v_id;
end $$;

create or replace function ten29_private.issue_priced_quote(p_quote uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.booking_quotes; req public.booking_requests;
begin
 perform ten29_private.require_pricing_owner();
 select * into q from public.booking_quotes where id=p_quote;
 if not found or not exists(select 1 from public.booking_quote_pricing_snapshots where quote_id=p_quote) then raise check_violation using message='Itemized quote not found'; end if;
 select * into req from public.booking_requests where id=q.request_id for update;
 select * into q from public.booking_quotes where id=p_quote;
 if exists(select 1 from public.booking_reservations where request_id=req.id) then raise check_violation using message='Confirmed prices cannot be changed'; end if;
 if q.status='ISSUED' then return q.id; end if;
 if req.status not in ('REVIEWING','QUOTED','AWAITING_DEPOSIT') or q.required_deposit_amount is null
  or (q.valid_until is not null and q.valid_until<=clock_timestamp()) then raise check_violation using message='Owner-approved payment terms are required'; end if;
 if req.policy_version<>'LEGACY' and not exists(select 1 from public.booking_policy_events where quote_id=q.id and type='QUOTE_AUTHORIZE') then raise check_violation using message='Final OWNER payment authorization required'; end if;
 update public.booking_quotes set status='ISSUED',owner_approved_by=auth.uid(),owner_approved_at=clock_timestamp(),issued_by=auth.uid(),issued_at=clock_timestamp() where id=q.id;
 if req.status<>'QUOTED' then update public.booking_requests set status='QUOTED' where id=req.id; end if;
 return q.id;
end $$;

create or replace function ten29_private.confirm_reservation(p_request_id uuid, p_quote_id uuid, p_idempotency_key uuid)
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
  if v_request.policy_version='LEGACY' then
  select max_guests into v_max from public.property_packages
    where code = v_request.package_code and property_id = v_request.property_id;
  if v_request.overnight_guest_count is null or v_request.overnight_guest_count < 1
    or v_request.overnight_guest_count > 8 or v_max is null
    or (v_request.folding_foams_requested and v_request.package_code <> 'WHOLE_HOME_3BR')
    or (v_request.overnight_guest_count > v_max and not
      (v_request.package_code = 'WHOLE_HOME_3BR' and v_request.folding_foams_requested)) then
    raise check_violation using message = 'Booking request exceeds eligible occupancy';
  end if;
  else
    if not exists(select 1 from public.booking_policy_events where quote_id=p_quote_id and type='QUOTE_AUTHORIZE')
     or not exists(select 1 from public.booking_quote_pricing_snapshots s where s.quote_id=p_quote_id
      and s.breakdown->'policy'->>'version'=v_request.policy_version
      and (s.breakdown->'policy'->>'actual_occupants')::integer=v_request.overnight_guest_count
      and (s.breakdown->'policy'->>'extra_approved')::integer=v_request.extra_guests_requested) then raise check_violation using message='Applicable policy quotation required'; end if;
    if (v_request.extra_guests_requested>0 or v_request.occupancy_owner_review) and not exists(
     select 1 from public.booking_policy_events e join public.booking_quote_pricing_snapshots s on s.quote_id=p_quote_id
     where e.id=(s.breakdown->'policy'->>'extra_approval_event')::uuid and e.type='EXTRA_APPROVE' and e.request_id=v_request.id
      and (e.data->>'count')::integer=v_request.extra_guests_requested) then raise check_violation using message='OWNER extra-guest approval required'; end if;
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

create or replace function ten29_private.read_booking_operations(p_from date,p_to date,p_request uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare ids uuid[];
begin
 if not public.is_ten29_admin() then raise insufficient_privilege using message='TEN29 access required'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then raise check_violation using message='Invalid calendar range'; end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into ids from (select id from public.booking_requests
  where (p_request is not null and id=p_request) or (p_request is null and check_in_date<p_to and check_out_date>p_from)
  order by created_at desc limit 1000) x;
 return jsonb_build_object('policy_events',case when public.is_ten29_owner() then coalesce((select jsonb_agg(e order by created_at,id) from public.booking_policy_events e where request_id=any(ids)),'[]') else '[]'::jsonb end,'owner',public.is_ten29_owner(),'requests',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object(
  'reference',coalesce(i.reference_code,r.id::text),'full_name',coalesce(i.full_name,c.full_name),'contact_number',coalesce(i.mobile_number,c.contact_number),
  'email',coalesce(i.email,c.email),'notes',coalesce(c.notes,i.message))) from public.booking_requests r left join public.inquiries i on i.id=r.inquiry_id
  left join public.manual_booking_contacts c on c.request_id=r.id where r.id=any(ids)),'[]'),
 'quotes',coalesce((select jsonb_agg(q order by q.revision desc) from public.booking_quotes q where request_id=any(ids)),'[]'),
 'deposits',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('decision',v.decision,'decided_by',v.actor_id,'decided_at',v.created_at)) from public.booking_deposits d
  left join public.booking_deposit_verifications v on v.deposit_id=d.id where d.request_id=any(ids)),'[]'),
 'reservations',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('operational_status',coalesce(
  (select case action when 'CANCEL' then 'CANCELLED' else 'COMPLETED' end from public.booking_operation_events where reservation_id=r.id and action in ('CANCEL','COMPLETE')),r.status::text)))
  from public.booking_reservations r where request_id=any(ids)),'[]'),
 'occupancies',coalesce((select jsonb_agg(o) from public.property_occupancies o where check_in_date<p_to and check_out_date>p_from),'[]'),
 'events',coalesce((select jsonb_agg(e order by created_at desc) from public.booking_operation_events e where request_id=any(ids)),'[]'),
 'request_events',coalesce((select jsonb_agg(e order by created_at desc) from public.booking_request_events e where request_id=any(ids)),'[]'),
 'reservation_events',coalesce((select jsonb_agg(e order by created_at desc) from public.booking_reservation_events e where reservation_id in(select id from public.booking_reservations where request_id=any(ids))),'[]'),
 'block_events',coalesce((select jsonb_agg(e order by created_at desc) from public.property_occupancy_events e where occupancy_id in(select id from public.property_occupancies where kind='OWNER_BLOCK' and check_in_date<p_to and check_out_date>p_from)),'[]'),
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('request_id',request_id,'recipient_kind',recipient_kind,'status',status,'attempts',attempts,'first_attempt_at',first_attempt_at)) from public.booking_notification_outbox where request_id=any(ids)),'[]'),
 'estimates',coalesce((select jsonb_agg(jsonb_build_object('request_id',request_id,'estimate',estimate)) from public.website_booking_intakes where request_id=any(ids)),'[]'));
end $$;

create or replace function ten29_private.decide_deposit(
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
    or exists (select 1 from public.booking_operation_events where request_id = v_deposit.request_id and action in ('CANCEL','COMPLETE'))
    or v_deposit.status <> 'RECORDED_UNVERIFIED' then
    raise check_violation using message = 'Request is not awaiting payment verification';
  end if;
  insert into public.booking_deposit_verifications(idempotency_key,deposit_id,decision,independently_verified,actor_id)
  values (p_idempotency_key,p_deposit_id,p_decision,p_independently_verified,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.guard_booking_deposit_insert()
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
  if exists(select 1 from public.booking_operation_events where request_id=new.request_id and action in ('CANCEL','COMPLETE')) then raise check_violation; end if;
  if exists(select 1 from public.booking_requests where id=new.request_id and policy_version<>'LEGACY') and coalesce(new.payment_method,'') not in ('BANK_TRANSFER','GCASH') then raise check_violation; end if;
  new.recorded_by := (select auth.uid());
  return new;
end;
$$;

create or replace function public.owner_media_action(p_action text, p_id uuid, p_version integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.property_media; new_id uuid; key_id uuid; old public.property_media;
begin
 if not public.is_ten29_owner() then raise exception 'OWNER required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(421296);
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise check_violation; end if;
 if p_action='RESERVE' and (p_data-array['key','mime','bytes'])<>'{}'::jsonb then raise check_violation using message='Only property photo/video uploads are supported'; end if;
 if p_action='RESERVE' then
  key_id := (p_data->>'key')::uuid;
  select * into m from public.property_media where upload_key=key_id;
  if found then
   if m.uploaded_by<>auth.uid() or m.bytes<>(p_data->>'bytes')::bigint or m.mime<>p_data->>'mime' then raise exception 'Upload key conflict'; end if;
   return to_jsonb(m);
  end if;
  if (select count(*) from public.property_media where cleaned_at is null)>=(select file_count from public.media_limits where id=1)
   or (select coalesce(sum(quota_bytes),0) from public.property_media where cleaned_at is null)+105906176 >(select library_bytes from public.media_limits where id=1)
   then raise exception 'Media quota reached'; end if;
  if p_data->>'mime' not in ('image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime') then raise exception 'Unsupported type'; end if;
  if (p_data->>'bytes')::bigint > (select case when p_data->>'mime' like 'image/%' then photo_bytes else video_bytes end from public.media_limits where id=1) then raise exception 'File too large'; end if;
  new_id:=gen_random_uuid();
  insert into public.property_media(id,kind,mime,bytes,original_key,upload_key,uploaded_by)
   values(new_id,case when p_data->>'mime' like 'image/%' then 'PHOTO' else 'VIDEO' end,p_data->>'mime',(p_data->>'bytes')::bigint,new_id::text||'/original',key_id,auth.uid()) returning * into m;
 else
  select * into m from public.property_media where id=p_id for update;
  if not found then raise exception 'Media not found'; end if;
  if m.version<>p_version then raise exception 'Stale media revision'; end if;
  if p_action='EDIT' then
   if m.state in ('PUBLISHED','ARCHIVED') then raise exception 'Unpublish before editing'; end if;
   if p_data->>'category' not in ('Exterior','Entrance','Living Area','Kitchen & Dining','Room 1','Room 2','Room 3','Bathrooms','Lanai / Outdoor','Parking','Amenities','Property Tour Videos') then raise exception 'Category requires separate approval'; end if;
   update public.property_media set title=p_data->>'title',caption=p_data->>'caption',alt=p_data->>'alt',category=p_data->>'category',
    position=(p_data->>'position')::integer,rights_acknowledged=(p_data->>'rights')::boolean,public_claim_id=p_data->>'public_claim_id',version=version+1 where id=m.id returning * into m;
  elsif p_action='PUBLISH' then
   if m.state not in ('READY_FOR_REVIEW','UNPUBLISHED') or m.rendition_key is null or not m.rights_acknowledged or m.alt='' then raise exception 'Media is not ready for publication'; end if;
   if not exists(select 1 from storage.objects where bucket_id='ten29-renditions' and name=m.rendition_key)
    or (m.kind='VIDEO' and not exists(select 1 from storage.objects where bucket_id='ten29-renditions' and name=m.poster_key)) then raise exception 'Rendition missing'; end if;
   -- Optional replacement is an atomic visibility swap after validation.
   if p_data->>'replace' is not null then
    select * into old from public.property_media where id=(p_data->>'replace')::uuid for update;
    if old.id is null or old.state<>'PUBLISHED' or old.id=m.id then raise exception 'Invalid replacement'; end if;
    update public.property_media set state='UNPUBLISHED',featured=false,version=version+1 where id=old.id;
    insert into public.media_audit_events(media_id,actor,event,version) values(old.id,auth.uid(),'REPLACED',old.version+1);
   end if;
   update public.property_media set state='PUBLISHED',published_by=auth.uid(),published_at=now(),version=version+1 where id=m.id returning * into m;
  elsif p_action in ('UNPUBLISH','ARCHIVE') then
   if p_action='UNPUBLISH' and m.state<>'PUBLISHED' then raise exception 'Not published'; end if;
   update public.property_media set state=case when p_action='ARCHIVE' then 'ARCHIVED' else 'UNPUBLISHED' end,featured=false,version=version+1 where id=m.id returning * into m;
  elsif p_action='COVER' then
   if m.kind<>'PHOTO' or m.state<>'PUBLISHED' then raise exception 'Cover must be a published photo'; end if;
   insert into public.media_audit_events(media_id,actor,event,version) select id,auth.uid(),'COVER_CLEARED',version+1 from public.property_media where featured and id<>m.id;
   update public.property_media set featured=false,version=version+1 where featured and id<>m.id;
   update public.property_media set featured=true,version=version+1 where id=m.id returning * into m;
  else raise exception 'Invalid media action'; end if;
 end if;
 insert into public.media_audit_events(media_id,actor,event,version) values(m.id,auth.uid(),p_action,m.version);
 return to_jsonb(m);
end $$;

-- Defense in depth for text ingress. No rejected text is logged or hashed here.
-- This detects explicit document references; it cannot classify a renamed image.
create function ten29_private.guard_nonstored_rules() returns trigger
language plpgsql set search_path='' as $$
begin
 if to_jsonb(new)::text ~* 'house[[:space:]_-]*rules' then
  raise check_violation using message='House Rules contents and copies must remain outside TEN29';
 end if;
 return new;
end $$;
revoke all on function ten29_private.guard_nonstored_rules() from public,anon,authenticated,service_role;
create trigger nonstored_rules_inquiries before insert or update on public.inquiries for each row execute function ten29_private.guard_nonstored_rules();
create trigger nonstored_rules_contacts before insert on public.manual_booking_contacts for each row execute function ten29_private.guard_nonstored_rules();
create trigger nonstored_rules_notes before insert on public.booking_operation_events for each row execute function ten29_private.guard_nonstored_rules();
create trigger nonstored_rules_quote before insert on public.booking_quote_pricing_snapshots for each row execute function ten29_private.guard_nonstored_rules();
create trigger nonstored_rules_media before insert or update on public.property_media for each row execute function ten29_private.guard_nonstored_rules();
