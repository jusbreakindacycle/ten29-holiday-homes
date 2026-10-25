-- Owner-controlled, auditable promotional prices. No promotion is seeded.
create table public.calendar_promotion_heads (
  package_code public.booking_package_code primary key references public.property_packages(code),
  next_revision bigint not null default 1,
  active_promotion_id uuid
);
insert into public.calendar_promotion_heads(package_code) select code from public.property_packages;

create table public.calendar_promotions (
  id uuid primary key default gen_random_uuid(),
  package_code public.booking_package_code not null references public.property_packages(code),
  revision bigint not null,
  base_promotion_id uuid references public.calendar_promotions(id),
  save_key uuid not null unique,
  publication_key uuid unique,
  status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED')),
  former_amount_centavos bigint not null check(former_amount_centavos between 1 and 999999999),
  promotional_amount_centavos bigint not null check(promotional_amount_centavos between 1 and 999999999),
  eligible_from_date date not null,
  eligible_to_date date not null,
  minimum_nights smallint not null check(minimum_nights between 1 and 366),
  maximum_nights smallint not null check(maximum_nights between 1 and 366),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  former_price_basis text not null check(former_price_basis in ('SOLD_WITHIN_90_DAYS','OFFERED_4_WEEKS_WITHIN_90_DAYS','OLDER_PERIOD_DISCLOSED')),
  former_price_period text not null check(char_length(btrim(former_price_period)) between 1 and 240),
  former_price_evidence text not null check(char_length(btrim(former_price_evidence)) between 1 and 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  former_price_reviewed_by uuid references auth.users(id),
  former_price_reviewed_at timestamptz,
  dti_reviewed_by uuid references auth.users(id),
  dti_reviewed_at timestamptz,
  unique(package_code,revision),
  check(promotional_amount_centavos < former_amount_centavos),
  check(eligible_to_date > eligible_from_date),
  check(maximum_nights >= minimum_nights),
  check(valid_until > valid_from),
  check((status='PUBLISHED') = (published_by is not null and published_at is not null and publication_key is not null
    and former_price_reviewed_by is not null and former_price_reviewed_at is not null
    and dti_reviewed_by is not null and dti_reviewed_at is not null))
);
alter table public.calendar_promotion_heads add constraint active_promotion_fk
  foreign key(active_promotion_id) references public.calendar_promotions(id);

create table public.calendar_promotion_events (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.calendar_promotions(id),
  event text not null check(event in ('DRAFT_SAVED','PUBLISHED','DEACTIVATED')),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index calendar_promotion_event_unique on public.calendar_promotion_events(promotion_id,event);

create function ten29_private.promotion_json(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(p) - array['created_by','save_key','publication_key']
 from public.calendar_promotions p where p.id=p_id;
$$;

create function ten29_private.save_promotion(p_package public.booking_package_code,p_base uuid,p_former bigint,p_discount bigint,
 p_from date,p_to date,p_min smallint,p_max smallint,p_valid_from timestamptz,p_valid_until timestamptz,
 p_basis text,p_period text,p_evidence text,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h public.calendar_promotion_heads; v public.calendar_promotions; v_id uuid;
begin
 perform ten29_private.require_pricing_owner();
 if p_key is null or p_former not between 1 and 999999999 or p_discount not between 1 and 999999999 or p_discount>=p_former
  or p_from is null or p_to is null or p_to<=p_from or p_min not between 1 and 366 or p_max not between p_min and 366
  or p_valid_from is null or p_valid_until<=p_valid_from
  or p_basis not in ('SOLD_WITHIN_90_DAYS','OFFERED_4_WEEKS_WITHIN_90_DAYS','OLDER_PERIOD_DISCLOSED')
  or char_length(btrim(p_period)) not between 1 and 240 or char_length(btrim(p_evidence)) not between 1 and 1000 then
  raise check_violation using message='Invalid promotion terms';
 end if;
 select * into h from public.calendar_promotion_heads where package_code=p_package for update;
 if not found then raise check_violation using message='Invalid package'; end if;
 select * into v from public.calendar_promotions where save_key=p_key;
 if found then
  if v.package_code=p_package and v.base_promotion_id is not distinct from p_base and v.former_amount_centavos=p_former
   and v.promotional_amount_centavos=p_discount and v.eligible_from_date=p_from and v.eligible_to_date=p_to
   and v.minimum_nights=p_min and v.maximum_nights=p_max and v.valid_from=p_valid_from and v.valid_until=p_valid_until
   and v.former_price_basis=p_basis and v.former_price_period=p_period and v.former_price_evidence=p_evidence then return v.id; end if;
  raise check_violation using message='Promotion idempotency key was already used';
 end if;
 if h.active_promotion_id is distinct from p_base then raise check_violation using message='Promotion changed; reload before saving'; end if;
 insert into public.calendar_promotions(package_code,revision,base_promotion_id,save_key,former_amount_centavos,
  promotional_amount_centavos,eligible_from_date,eligible_to_date,minimum_nights,maximum_nights,valid_from,valid_until,
  former_price_basis,former_price_period,former_price_evidence,created_by)
 values(p_package,h.next_revision,p_base,p_key,p_former,p_discount,p_from,p_to,p_min,p_max,p_valid_from,p_valid_until,
  p_basis,btrim(p_period),btrim(p_evidence),auth.uid()) returning id into v_id;
 update public.calendar_promotion_heads set next_revision=next_revision+1 where package_code=p_package;
 insert into public.calendar_promotion_events(promotion_id,event,actor_id) values(v_id,'DRAFT_SAVED',auth.uid());
 return v_id;
end $$;

create function ten29_private.publish_promotion(p_id uuid,p_base uuid,p_key uuid,p_former_reviewed boolean,p_dti_reviewed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.calendar_promotions; h public.calendar_promotion_heads;
begin
 perform ten29_private.require_pricing_owner();
 if p_key is null or p_former_reviewed is distinct from true or p_dti_reviewed is distinct from true then
  raise check_violation using message='Former-price and DTI review confirmations are required';
 end if;
 select * into v from public.calendar_promotions where id=p_id;
 if not found then raise check_violation using message='Promotion draft not found'; end if;
 select * into h from public.calendar_promotion_heads where package_code=v.package_code for update;
 select * into v from public.calendar_promotions where id=p_id for update;
 if v.status='PUBLISHED' then
  if v.publication_key=p_key and v.base_promotion_id is not distinct from p_base then return v.id; end if;
  raise check_violation using message='Promotion revision already published';
 end if;
 if v.base_promotion_id is distinct from p_base or h.active_promotion_id is distinct from p_base then
  raise check_violation using message='Promotion changed; reload before publishing';
 end if;
 update public.calendar_promotions set status='PUBLISHED',published_by=auth.uid(),published_at=clock_timestamp(),publication_key=p_key,
  former_price_reviewed_by=auth.uid(),former_price_reviewed_at=clock_timestamp(),dti_reviewed_by=auth.uid(),dti_reviewed_at=clock_timestamp()
  where id=p_id;
 update public.calendar_promotion_heads set active_promotion_id=p_id where package_code=v.package_code;
 insert into public.calendar_promotion_events(promotion_id,event,actor_id) values(p_id,'PUBLISHED',auth.uid());
 return p_id;
end $$;

create function ten29_private.deactivate_promotion(p_package public.booking_package_code,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform ten29_private.require_pricing_owner();
 update public.calendar_promotion_heads set active_promotion_id=null where package_code=p_package and active_promotion_id=p_id;
 if not found then raise check_violation using message='Promotion is no longer active'; end if;
 insert into public.calendar_promotion_events(promotion_id,event,actor_id) values(p_id,'DEACTIVATED',auth.uid());
end $$;

create function ten29_private.guard_promotion_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status<>'DRAFT' or new.id<>old.id or new.package_code<>old.package_code or new.revision<>old.revision
  or new.base_promotion_id is distinct from old.base_promotion_id or new.save_key<>old.save_key
  or new.former_amount_centavos<>old.former_amount_centavos or new.promotional_amount_centavos<>old.promotional_amount_centavos
  or new.eligible_from_date<>old.eligible_from_date or new.eligible_to_date<>old.eligible_to_date
  or new.minimum_nights<>old.minimum_nights or new.maximum_nights<>old.maximum_nights
  or new.valid_from<>old.valid_from or new.valid_until<>old.valid_until or new.former_price_basis<>old.former_price_basis
  or new.former_price_period<>old.former_price_period or new.former_price_evidence<>old.former_price_evidence
  or new.created_by<>old.created_by or new.created_at<>old.created_at or new.status<>'PUBLISHED'
  or new.published_by is null or new.published_at is null or new.publication_key is null
  or new.former_price_reviewed_by is null or new.former_price_reviewed_at is null
  or new.dti_reviewed_by is null or new.dti_reviewed_at is null then
  raise check_violation using message='Published promotion revisions are immutable';
 end if;
 return new;
end $$;
create trigger promotion_revision_guard before update on public.calendar_promotions for each row execute function ten29_private.guard_promotion_revision();
create trigger promotion_delete_guard before delete on public.calendar_promotions for each row execute function ten29_private.reject_history_change();
create trigger promotion_event_history_guard before update or delete on public.calendar_promotion_events for each row execute function ten29_private.reject_history_change();

create function ten29_private.owner_promotion_state(p_package public.booking_package_code) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_active uuid; v_history jsonb;
begin
 perform ten29_private.require_pricing_owner();
 select active_promotion_id into v_active from public.calendar_promotion_heads where package_code=p_package;
 select coalesce(jsonb_agg(ten29_private.promotion_json(p.id) order by p.revision desc),'[]'::jsonb) into v_history
 from (select id,revision from public.calendar_promotions where package_code=p_package order by revision desc limit 30) p;
 return jsonb_build_object('package_code',p_package,'active_promotion_id',v_active,
  'active',case when v_active is null then null else ten29_private.promotion_json(v_active) end,'history',v_history);
end $$;

create function ten29_private.promotion_for_stay(p_package public.booking_package_code,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.calendar_promotions;
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then return null; end if;
 select p.* into v from public.calendar_promotion_heads h join public.calendar_promotions p on p.id=h.active_promotion_id
 where h.package_code=p_package and p.status='PUBLISHED' and p.valid_from<=clock_timestamp() and clock_timestamp()<p.valid_until
  and p_from>=p.eligible_from_date and p_to<=p.eligible_to_date+1
  and p_to-p_from between p.minimum_nights and p.maximum_nights;
 if not found then return null; end if;
 return jsonb_build_object('id',v.id,'revision',v.revision,'package_code',v.package_code,
  'former_amount_centavos',v.former_amount_centavos,'promotional_amount_centavos',v.promotional_amount_centavos,
  'eligible_from_date',v.eligible_from_date,'eligible_to_date',v.eligible_to_date,'minimum_nights',v.minimum_nights,
  'maximum_nights',v.maximum_nights,'valid_from',v.valid_from,'valid_until',v.valid_until,
  'former_price_basis',v.former_price_basis,'former_price_period',v.former_price_period);
end $$;

create or replace function ten29_private.read_prices(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_revision uuid; v_nights jsonb; v_total bigint; v_missing boolean; v_cap integer; v_rooms integer; v_promotion jsonb;
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then raise check_violation using message='Price window must be between 1 and 366 nights'; end if;
 select max_guests,bedrooms_access into v_cap,v_rooms from public.property_packages where code=p_package;
 if v_cap is null or p_guests is null or p_guests<1 or p_guests>8 or p_foams is null
  or (p_foams and p_package<>'WHOLE_HOME_3BR')
  or (p_guests>v_cap and not(p_package='WHOLE_HOME_3BR' and p_foams)) then raise check_violation using message='Ineligible package occupancy'; end if;
 v_promotion:=ten29_private.promotion_for_stay(p_package,p_from,p_to);
 select published_revision_id into v_revision from public.calendar_rate_heads where package_code=p_package;
 select jsonb_agg(jsonb_build_object('date',d,'package_code',p_package,
   'amount_centavos',case when v_promotion is null then r.amount_centavos else (v_promotion->>'promotional_amount_centavos')::bigint end,
   'source',case when v_promotion is null then coalesce(r.source,'MISSING') else 'PROMOTION' end,
   'rate_revision_id',v_revision,'promotion_id',case when v_promotion is null then null else v_promotion->>'id' end) order by d),
  bool_or(v_promotion is null and r.amount_centavos is null),
  sum(case when v_promotion is null then r.amount_centavos else (v_promotion->>'promotional_amount_centavos')::bigint end)::bigint
  into v_nights,v_missing,v_total
 from (select p_from+i as d from generate_series(0,p_to-p_from-1) i) days
 left join lateral ten29_private.resolve_rate(v_revision,d) r on true;
 return jsonb_build_object('package_code',p_package,'bedrooms_opened',v_rooms,'private_whole_house',true,
  'check_in_date',p_from,'check_out_date',p_to,'overnight_guest_count',p_guests,'folding_foams_requested',p_foams,
  'version',v_revision,'nights',v_nights,'missing_rates',v_missing,
  'accommodation_subtotal_centavos',case when v_missing then null else v_total end,
  'estimated_total_centavos',case when v_missing then null else v_total end,'estimate_kind','ACCOMMODATION_ONLY','currency','PHP',
  'promotion',v_promotion);
end $$;

create or replace function ten29_private.prepare_priced_quote(p_request uuid,p_expected_rate uuid,p_deposit bigint,p_adjustments jsonb,
 p_manual_nights jsonb,p_security_deposit bigint,p_conditions text,p_valid_until timestamptz,p_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare req public.booking_requests; prices jsonb; night jsonb; manual jsonb; adj jsonb; items jsonb:='[]'; adjustments jsonb:='[]';
 subtotal bigint:=0; charges bigint:=0; discounts bigint:=0; line bigint; amount bigint; v_id uuid; v_revision integer;
 v_snapshot jsonb; existing public.booking_quotes; current_rate uuid; n integer; saved_input jsonb;
begin
 perform ten29_private.require_pricing_owner();
 if p_key is null or p_deposit<0 or p_deposit>999999999999 or p_security_deposit<0 or p_security_deposit>999999999999
  or char_length(p_conditions)>500 or (p_valid_until is not null and p_valid_until<=clock_timestamp())
  or p_adjustments is null or jsonb_typeof(p_adjustments)<>'array' or jsonb_array_length(p_adjustments)>50
  or p_manual_nights is null or jsonb_typeof(p_manual_nights)<>'array' or jsonb_array_length(p_manual_nights)>366 then
  raise check_violation using message='Invalid quotation inputs'; end if;
 select * into req from public.booking_requests where id=p_request for update;
 if not found then raise check_violation using message='Booking request not found'; end if;
 saved_input:=jsonb_build_object('request_id',p_request,'expected_rate',p_expected_rate,'deposit',p_deposit,
  'adjustments',p_adjustments,'manual_nights',p_manual_nights,'security_deposit',p_security_deposit,'conditions',p_conditions,'valid_until',p_valid_until);
 select * into existing from public.booking_quotes where idempotency_key=p_key;
 if found then
  if (select breakdown->'owner_input' from public.booking_quote_pricing_snapshots where quote_id=existing.id)=saved_input then return existing.id; end if;
  raise check_violation using message='Idempotency key was already used'; end if;
 if req.status not in ('REVIEWING','QUOTED','AWAITING_DEPOSIT') or exists(select 1 from public.booking_reservations where request_id=p_request) then
  raise check_violation using message='Request is not eligible for a new quote'; end if;
 select published_revision_id into current_rate from public.calendar_rate_heads where package_code=req.package_code for share;
 if current_rate is distinct from p_expected_rate then raise check_violation using message='Rates changed; review the current estimate'; end if;
 prices:=ten29_private.read_prices(req.package_code,req.check_in_date,req.check_out_date,req.overnight_guest_count,req.folding_foams_requested);
 if prices->'promotion' is distinct from 'null'::jsonb and jsonb_array_length(p_manual_nights)>0 then
  raise check_violation using message='An eligible published promotion cannot be replaced with manual nightly prices'; end if;
 for manual in select value from jsonb_array_elements(p_manual_nights) loop
  if jsonb_typeof(manual)<>'object' or (manual-array['date','amount_centavos','reason'])<>'{}'::jsonb
   or coalesce(manual->>'amount_centavos','') !~ '^[0-9]{1,9}$'
   or coalesce(char_length(btrim(manual->>'reason')),0) not between 1 and 200
   or coalesce(manual->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
   or (manual->>'date')::date<req.check_in_date or (manual->>'date')::date>=req.check_out_date then
   raise check_violation using message='Manual nightly prices require an in-stay date and owner reason'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'date') from jsonb_array_elements(p_manual_nights)) then raise check_violation using message='Duplicate manual night'; end if;
 for night in select value from jsonb_array_elements(prices->'nights') loop
  select value into manual from jsonb_array_elements(p_manual_nights) where value->>'date'=night->>'date';
  if found then amount:=(manual->>'amount_centavos')::bigint;
   night:=night||jsonb_build_object('amount_centavos',amount,'source','OWNER_MANUAL','rate_revision_id',null,
    'reason',manual->>'reason','approved_by',auth.uid(),'approved_at',clock_timestamp());
  else amount:=(night->>'amount_centavos')::bigint; end if;
  if amount is null then raise check_violation using message='Missing nightly rate; request an owner quote'; end if;
  subtotal:=subtotal+amount; items:=items||jsonb_build_array(night);
 end loop;
 for adj in select value from jsonb_array_elements(p_adjustments) loop
  if jsonb_typeof(adj)<>'object' or (adj-array['type','description','quantity','unit_amount_centavos','reason'])<>'{}'::jsonb
   or coalesce(adj->>'type','') not in ('CHARGE','DISCOUNT')
   or coalesce(char_length(btrim(adj->>'description')),0) not between 1 and 160
   or coalesce(char_length(btrim(adj->>'reason')),0) not between 1 and 200
   or coalesce(adj->>'quantity','') !~ '^[0-9]{1,4}$' or (adj->>'quantity')::integer not between 1 and 1000
   or coalesce(adj->>'unit_amount_centavos','') !~ '^[0-9]{1,9}$' then raise check_violation using message='Invalid owner adjustment'; end if;
  if prices->'promotion' is distinct from 'null'::jsonb and adj->>'type'='DISCOUNT' then
   raise check_violation using message='Promotion discount stacking is not configured'; end if;
  line:=(adj->>'quantity')::bigint*(adj->>'unit_amount_centavos')::bigint;
  if adj->>'type'='DISCOUNT' then discounts:=discounts+line; line:=-line; else charges:=charges+line; end if;
  adjustments:=adjustments||jsonb_build_array(adj||jsonb_build_object('line_total_centavos',line,'status','APPROVED','approved_by',auth.uid(),'approved_at',clock_timestamp()));
 end loop;
 amount:=subtotal+charges-discounts;
 if amount<0 or amount>999999999999 or p_deposit>amount then raise check_violation using message='Invalid final quotation total or required deposit'; end if;
 select coalesce(max(revision),0)+1 into v_revision from public.booking_quotes where request_id=p_request;
 n:=req.check_out_date-req.check_in_date;
 v_snapshot:=jsonb_build_object('schema_version',1,'currency','PHP','owner_input',saved_input,
  'booking',jsonb_build_object('reference',coalesce((select reference_code from public.inquiries where id=req.inquiry_id),req.id::text),
   'request_id',req.id,'guest_count',req.overnight_guest_count,'package_code',req.package_code,
   'bedrooms_opened',(select bedrooms_access from public.property_packages where code=req.package_code),
   'check_in_date',req.check_in_date,'check_out_date',req.check_out_date,'nights',n),
  'accommodation',jsonb_build_object('nights',items,'subtotal_centavos',subtotal),
  'promotion',prices->'promotion','adjustments',adjustments,'additional_charges_centavos',charges,'discounts_centavos',discounts,
  'adjustment_total_centavos',charges-discounts,'final_total_centavos',amount,
  'payment',jsonb_build_object('required_down_payment_centavos',p_deposit,'refundable_security_deposit_centavos',p_security_deposit,'conditions',p_conditions));
 insert into public.booking_quotes(idempotency_key,request_id,revision,amount_total,required_deposit_amount,valid_until,line_items)
 values(p_key,p_request,v_revision,amount::numeric/100,p_deposit::numeric/100,p_valid_until,items) returning id into v_id;
 insert into public.booking_quote_pricing_snapshots(quote_id,breakdown,created_by) values(v_id,v_snapshot,auth.uid());
 return v_id;
end $$;

create or replace function ten29_private.issue_priced_quote(p_quote uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.booking_quotes; req public.booking_requests; snapshot jsonb; promo_id uuid;
begin
 perform ten29_private.require_pricing_owner();
 select * into q from public.booking_quotes where id=p_quote;
 if not found or not exists(select 1 from public.booking_quote_pricing_snapshots where quote_id=p_quote) then raise check_violation using message='Itemized quote not found'; end if;
 select * into req from public.booking_requests where id=q.request_id for update;
 select * into q from public.booking_quotes where id=p_quote;
 select breakdown into snapshot from public.booking_quote_pricing_snapshots where quote_id=p_quote;
 if snapshot->'promotion' is distinct from 'null'::jsonb then
  promo_id:=(snapshot->'promotion'->>'id')::uuid;
  if (select active_promotion_id from public.calendar_promotion_heads where package_code=req.package_code) is distinct from promo_id
   or (snapshot->'promotion'->>'valid_until')::timestamptz<=clock_timestamp() then
   raise check_violation using message='The promotion changed or expired; prepare a current quotation';
  end if;
 end if;
 if exists(select 1 from public.booking_reservations where request_id=req.id) then raise check_violation using message='Confirmed prices cannot be changed'; end if;
 if q.status='ISSUED' then return q.id; end if;
 if req.status not in ('REVIEWING','QUOTED','AWAITING_DEPOSIT') or q.required_deposit_amount is null
  or (q.valid_until is not null and q.valid_until<=clock_timestamp()) then raise check_violation using message='Owner-approved payment terms are required'; end if;
 update public.booking_quotes set status='ISSUED',owner_approved_by=auth.uid(),owner_approved_at=clock_timestamp(),issued_by=auth.uid(),issued_at=clock_timestamp() where id=q.id;
 if req.status<>'QUOTED' then update public.booking_requests set status='QUOTED' where id=req.id; end if;
 return q.id;
end $$;

create or replace function ten29_private.read_quote_breakdown(p_quote uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.booking_quotes; req public.booking_requests; snapshot jsonb; paid bigint;
begin
 perform ten29_private.require_pricing_owner();
 select * into q from public.booking_quotes where id=p_quote;
 if not found then raise check_violation using message='Quote not found'; end if;
 if q.currency<>'PHP' then raise check_violation using message='This preview supports PHP quotations only; the historical record is unchanged'; end if;
 select * into req from public.booking_requests where id=q.request_id;
 select breakdown-'owner_input' into snapshot from public.booking_quote_pricing_snapshots where quote_id=q.id;
 select (coalesce(sum(d.amount),0)*100)::bigint into paid from public.booking_deposits d
 join public.booking_deposit_verifications v on v.deposit_id=d.id and v.decision='VERIFIED' where d.request_id=req.id;
 if snapshot is null then snapshot:=jsonb_build_object('legacy',true,'currency',q.currency,
  'booking',jsonb_build_object('reference',req.id,'package_code',req.package_code,'guest_count',req.overnight_guest_count,
   'check_in_date',req.check_in_date,'check_out_date',req.check_out_date,'nights',req.check_out_date-req.check_in_date,
   'bedrooms_opened',(select bedrooms_access from public.property_packages where code=req.package_code)),
  'accommodation',jsonb_build_object('nights','[]'::jsonb,'subtotal_centavos',null),'promotion',null,'adjustments','[]'::jsonb,
  'additional_charges_centavos',null,'discounts_centavos',null,'final_total_centavos',(q.amount_total*100)::bigint,
  'payment',jsonb_build_object('required_down_payment_centavos',(q.required_deposit_amount*100)::bigint,'refundable_security_deposit_centavos',null,'conditions',null)); end if;
 return snapshot||jsonb_build_object('quote_id',q.id,'revision',q.revision,'status',q.status,'verified_payments_centavos',paid,
  'remaining_balance_centavos',case when q.amount_total is null then null else greatest(q.amount_total*100-paid,0)::bigint end,
  'overpayment_centavos',case when q.amount_total is null then null else greatest(paid-q.amount_total*100,0)::bigint end);
end $$;

create function public.save_calendar_promotion_draft(p_package public.booking_package_code,p_base uuid,p_former bigint,p_discount bigint,
 p_from date,p_to date,p_min smallint,p_max smallint,p_valid_from timestamptz,p_valid_until timestamptz,
 p_basis text,p_period text,p_evidence text,p_key uuid) returns uuid language sql security invoker set search_path='' as $$
 select ten29_private.save_promotion(p_package,p_base,p_former,p_discount,p_from,p_to,p_min,p_max,p_valid_from,p_valid_until,p_basis,p_period,p_evidence,p_key); $$;
create function public.publish_calendar_promotion(p_id uuid,p_base uuid,p_key uuid,p_former_reviewed boolean,p_dti_reviewed boolean) returns uuid language sql security invoker set search_path='' as $$
 select ten29_private.publish_promotion(p_id,p_base,p_key,p_former_reviewed,p_dti_reviewed); $$;
create function public.deactivate_calendar_promotion(p_package public.booking_package_code,p_id uuid) returns void language sql security invoker set search_path='' as $$
 select ten29_private.deactivate_promotion(p_package,p_id); $$;
create function public.read_owner_promotion_state(p_package public.booking_package_code) returns jsonb language sql stable security invoker set search_path='' as $$
 select ten29_private.owner_promotion_state(p_package); $$;
create function public.read_public_promotion_teaser(p_package public.booking_package_code,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p jsonb;
begin
 p:=ten29_private.promotion_for_stay(p_package,p_from,p_to);
 if p is null then return null; end if;
 return jsonb_build_object('package_code',p_package,'former_amount_centavos',(p->>'former_amount_centavos')::bigint,
  'promotional_amount_centavos',(p->>'promotional_amount_centavos')::bigint,'minimum_nights',(p->>'minimum_nights')::integer,
  'maximum_nights',(p->>'maximum_nights')::integer,'price_basis','PER_NIGHT') ||
  case when p->>'former_price_basis'='OLDER_PERIOD_DISCLOSED'
    then jsonb_build_object('former_price_period',p->>'former_price_period') else '{}'::jsonb end;
end $$;
create function public.read_booking_price_snapshot(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean)
returns jsonb language sql stable security definer set search_path='' as $$
 select ten29_private.read_prices(p_package,p_from,p_to,p_guests,p_foams); $$;

alter table public.calendar_promotion_heads enable row level security;
alter table public.calendar_promotions enable row level security;
alter table public.calendar_promotion_events enable row level security;
revoke all on public.calendar_promotion_heads,public.calendar_promotions,public.calendar_promotion_events from public,anon,authenticated;
grant select on public.calendar_promotion_heads,public.calendar_promotions,public.calendar_promotion_events to authenticated;
create policy "Owner reads promotion heads" on public.calendar_promotion_heads for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads promotion revisions" on public.calendar_promotions for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads promotion audit" on public.calendar_promotion_events for select to authenticated using(public.is_ten29_owner());

revoke all on function ten29_private.promotion_json(uuid),ten29_private.save_promotion(public.booking_package_code,uuid,bigint,bigint,date,date,smallint,smallint,timestamptz,timestamptz,text,text,text,uuid),
 ten29_private.publish_promotion(uuid,uuid,uuid,boolean,boolean),ten29_private.deactivate_promotion(public.booking_package_code,uuid),
 ten29_private.owner_promotion_state(public.booking_package_code),ten29_private.promotion_for_stay(public.booking_package_code,date,date),
 ten29_private.guard_promotion_revision(),ten29_private.read_prices(public.booking_package_code,date,date,integer,boolean),
 ten29_private.prepare_priced_quote(uuid,uuid,bigint,jsonb,jsonb,bigint,text,timestamptz,uuid),
 ten29_private.issue_priced_quote(uuid),ten29_private.read_quote_breakdown(uuid)
 from public,anon,authenticated,service_role;
grant execute on function ten29_private.save_promotion(public.booking_package_code,uuid,bigint,bigint,date,date,smallint,smallint,timestamptz,timestamptz,text,text,text,uuid),
 ten29_private.publish_promotion(uuid,uuid,uuid,boolean,boolean),ten29_private.deactivate_promotion(public.booking_package_code,uuid),
 ten29_private.owner_promotion_state(public.booking_package_code) to authenticated;
grant execute on function ten29_private.read_prices(public.booking_package_code,date,date,integer,boolean) to ten29_intake_writer;

revoke all on function public.read_public_calendar_prices(public.booking_package_code,date,date,integer,boolean),
 public.read_booking_price_snapshot(public.booking_package_code,date,date,integer,boolean),
 public.read_public_promotion_teaser(public.booking_package_code,date,date),
 public.save_calendar_promotion_draft(public.booking_package_code,uuid,bigint,bigint,date,date,smallint,smallint,timestamptz,timestamptz,text,text,text,uuid),
 public.publish_calendar_promotion(uuid,uuid,uuid,boolean,boolean),public.deactivate_calendar_promotion(public.booking_package_code,uuid),
 public.read_owner_promotion_state(public.booking_package_code) from public,anon,authenticated,service_role;
grant execute on function public.read_booking_price_snapshot(public.booking_package_code,date,date,integer,boolean) to service_role;
grant execute on function public.read_public_promotion_teaser(public.booking_package_code,date,date) to anon,authenticated;
-- The pre-existing 0007 RPC exposed every selected nightly rate directly to anonymous callers.
-- Intake now uses the service-role-only snapshot RPC above; public callers receive only a qualified teaser.
revoke all on function public.read_public_calendar_prices(public.booking_package_code,date,date,integer,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.save_calendar_promotion_draft(public.booking_package_code,uuid,bigint,bigint,date,date,smallint,smallint,timestamptz,timestamptz,text,text,text,uuid),
 public.publish_calendar_promotion(uuid,uuid,uuid,boolean,boolean),public.deactivate_calendar_promotion(public.booking_package_code,uuid),
 public.read_owner_promotion_state(public.booking_package_code) to authenticated;
