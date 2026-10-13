-- No commercial amounts are seeded. A revision is a complete package rule set.
create table public.calendar_rate_heads (
 package_code public.booking_package_code primary key references public.property_packages(code),
 next_revision bigint not null default 1,
 published_revision_id uuid
);
insert into public.calendar_rate_heads(package_code) select code from public.property_packages;
create table public.calendar_rate_revisions (
 id uuid primary key default gen_random_uuid(),
 package_code public.booking_package_code not null references public.property_packages(code),
 revision bigint not null,
 base_revision_id uuid references public.calendar_rate_revisions(id),
 save_key uuid not null unique,
 publication_key uuid unique,
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 published_by uuid references auth.users(id),
 published_at timestamptz,
 unique(package_code,revision),
 check ((status='PUBLISHED') = (published_by is not null and published_at is not null and publication_key is not null))
);
alter table public.calendar_rate_heads add foreign key(published_revision_id) references public.calendar_rate_revisions(id);
create table public.calendar_rate_rules (
 revision_id uuid not null references public.calendar_rate_revisions(id),
 position integer not null,
 kind text not null check(kind in ('DEFAULT','WEEKDAY','DATE','RANGE')),
 amount_centavos bigint not null check(amount_centavos between 0 and 999999999),
 weekday smallint,
 start_date date,
 end_date date,
 primary key(revision_id,position),
 check ((kind='DEFAULT' and weekday is null and start_date is null and end_date is null)
   or (kind='WEEKDAY' and weekday is not null and weekday between 0 and 6 and start_date is null and end_date is null)
   or (kind='DATE' and weekday is null and end_date=start_date+1)
   or (kind='RANGE' and weekday is null and end_date>start_date)),
 check(kind not in ('DATE','RANGE') or (start_date is not null and end_date is not null)),
 exclude using gist(revision_id extensions.gist_uuid_ops with =, daterange(start_date,end_date,'[)') with &&) where(kind='RANGE')
);
create unique index calendar_rate_default_unique on public.calendar_rate_rules(revision_id) where kind='DEFAULT';
create unique index calendar_rate_weekday_unique on public.calendar_rate_rules(revision_id,weekday) where kind='WEEKDAY';
create unique index calendar_rate_date_unique on public.calendar_rate_rules(revision_id,start_date) where kind='DATE';
create table public.calendar_rate_events (
 id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.calendar_rate_revisions(id),
 event text not null check(event in ('DRAFT_SAVED','PUBLISHED')), actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), unique(revision_id,event)
);
create table public.booking_quote_pricing_snapshots (
 quote_id uuid primary key references public.booking_quotes(id),
 breakdown jsonb not null check(jsonb_typeof(breakdown)='object'),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create function ten29_private.require_pricing_owner() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_ten29_owner() then raise insufficient_privilege using message='TEN29 owner authorization required'; end if;
end $$;

create function ten29_private.validate_rate_rules(p_rules jsonb) returns void language plpgsql set search_path='' as $$
declare r jsonb;
begin
 if p_rules is null or jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>2048 then
  raise check_violation using message='Invalid rate rules';
 end if;
 for r in select value from jsonb_array_elements(p_rules) loop
  if jsonb_typeof(r)<>'object' or (r - array['kind','amount_centavos','weekday','start_date','end_date'])<>'{}'::jsonb
   or r->>'kind' is null or r->>'kind' not in ('DEFAULT','WEEKDAY','DATE','RANGE')
   or coalesce(r->>'amount_centavos','') !~ '^[0-9]{1,9}$' then
    raise check_violation using message='Invalid rate rule fields';
  end if;
 end loop;
 -- Shape and equal-priority conflicts are also enforced by normalized constraints.
end $$;

create function ten29_private.rate_rules_json(p_revision uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'amount_centavos',amount_centavos,
  'weekday',weekday,'start_date',start_date,'end_date',end_date) order by position),'[]'::jsonb)
 from public.calendar_rate_rules where revision_id=p_revision;
$$;

create function ten29_private.save_rates(p_package public.booking_package_code,p_base uuid,p_rules jsonb,p_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare h public.calendar_rate_heads; v public.calendar_rate_revisions; v_id uuid;
begin
 perform ten29_private.require_pricing_owner();
 perform ten29_private.validate_rate_rules(p_rules);
 -- Canonicalize optional null fields/types before matching an idempotent retry.
 select coalesce(jsonb_agg(jsonb_build_object('kind',r->>'kind','amount_centavos',(r->>'amount_centavos')::bigint,
  'weekday',(r->>'weekday')::smallint,'start_date',(r->>'start_date')::date,'end_date',(r->>'end_date')::date)
  order by ordinality),'[]'::jsonb) into p_rules
 from jsonb_array_elements(p_rules) with ordinality x(r,ordinality);
 if p_key is null then raise check_violation using message='Idempotency key required'; end if;
 select * into h from public.calendar_rate_heads where package_code=p_package for update;
 if not found then raise check_violation using message='Invalid package'; end if;
 select * into v from public.calendar_rate_revisions where save_key=p_key;
 if found then
  if v.package_code=p_package and v.base_revision_id is not distinct from p_base
    and ten29_private.rate_rules_json(v.id)=p_rules then return v.id; end if;
  raise check_violation using message='Idempotency key was already used';
 end if;
 if h.published_revision_id is distinct from p_base then raise check_violation using message='Rates changed; reload before saving'; end if;
 insert into public.calendar_rate_revisions(package_code,revision,base_revision_id,save_key,created_by)
 values(p_package,h.next_revision,p_base,p_key,auth.uid()) returning id into v_id;
 insert into public.calendar_rate_rules(revision_id,position,kind,amount_centavos,weekday,start_date,end_date)
 select v_id,ordinality::integer,r->>'kind',(r->>'amount_centavos')::bigint,
  (r->>'weekday')::smallint,(r->>'start_date')::date,(r->>'end_date')::date
 from jsonb_array_elements(p_rules) with ordinality as x(r,ordinality);
 update public.calendar_rate_heads set next_revision=next_revision+1 where package_code=p_package;
 insert into public.calendar_rate_events(revision_id,event,actor_id) values(v_id,'DRAFT_SAVED',auth.uid());
 return v_id;
end $$;

create function ten29_private.publish_rates(p_revision uuid,p_base uuid,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.calendar_rate_revisions; h public.calendar_rate_heads;
begin
 perform ten29_private.require_pricing_owner();
 if p_key is null then raise check_violation using message='Idempotency key required'; end if;
 select * into v from public.calendar_rate_revisions where id=p_revision;
 if not found then raise check_violation using message='Rate revision not found'; end if;
 select * into h from public.calendar_rate_heads where package_code=v.package_code for update;
 select * into v from public.calendar_rate_revisions where id=p_revision for update;
 if v.status='PUBLISHED' then
  if v.publication_key=p_key and v.base_revision_id is not distinct from p_base then return v.id; end if;
  raise check_violation using message='Revision already published';
 end if;
 if v.base_revision_id is distinct from p_base or h.published_revision_id is distinct from p_base then
  raise check_violation using message='Rates changed; reload before publishing';
 end if;
 update public.calendar_rate_revisions set status='PUBLISHED',published_by=auth.uid(),published_at=clock_timestamp(),publication_key=p_key where id=v.id;
 update public.calendar_rate_heads set published_revision_id=v.id where package_code=v.package_code;
 insert into public.calendar_rate_events(revision_id,event,actor_id) values(v.id,'PUBLISHED',auth.uid());
 return v.id;
end $$;

create function ten29_private.guard_rate_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='PUBLISHED' or new.id<>old.id or new.package_code<>old.package_code or new.revision<>old.revision
  or new.base_revision_id is distinct from old.base_revision_id or new.save_key<>old.save_key
  or new.created_by<>old.created_by or new.created_at<>old.created_at or new.status<>'PUBLISHED' then
  raise check_violation using message='Rate revisions are immutable';
 end if;
 return new;
end $$;
create trigger rate_revision_guard before update on public.calendar_rate_revisions for each row execute function ten29_private.guard_rate_revision();
create function ten29_private.guard_rate_rule_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform ten29_private.require_pricing_owner();
 if not exists(select 1 from public.calendar_rate_revisions where id=new.revision_id and status='DRAFT') then
  raise check_violation using message='Published rule sets are immutable';
 end if;
 return new;
end $$;
create trigger rate_rules_insert_guard before insert on public.calendar_rate_rules for each row execute function ten29_private.guard_rate_rule_insert();
create trigger rate_revision_delete_guard before delete on public.calendar_rate_revisions for each row execute function ten29_private.reject_history_change();
create trigger rate_rules_history_guard before update or delete on public.calendar_rate_rules for each row execute function ten29_private.reject_history_change();
create trigger rate_events_history_guard before update or delete on public.calendar_rate_events for each row execute function ten29_private.reject_history_change();
create trigger quote_pricing_history_guard before update or delete on public.booking_quote_pricing_snapshots for each row execute function ten29_private.reject_history_change();

create function ten29_private.resolve_rate(p_revision uuid,p_day date)
returns table(amount_centavos bigint,source text) language sql stable security definer set search_path='' as $$
 select r.amount_centavos,r.kind from public.calendar_rate_rules r where r.revision_id=p_revision
 and (r.kind='DEFAULT' or (r.kind='WEEKDAY' and r.weekday=extract(dow from p_day)::integer)
  or (r.kind in ('DATE','RANGE') and p_day>=r.start_date and p_day<r.end_date))
 order by case r.kind when 'DATE' then 1 when 'RANGE' then 2 when 'WEEKDAY' then 3 else 4 end limit 1;
$$;
create function ten29_private.read_prices(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_revision uuid; v_nights jsonb; v_total bigint; v_missing boolean; v_cap integer; v_rooms integer;
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then raise check_violation using message='Price window must be between 1 and 366 nights'; end if;
 select max_guests,bedrooms_access into v_cap,v_rooms from public.property_packages where code=p_package;
 if v_cap is null or p_guests is null or p_guests<1 or p_guests>8 or p_foams is null
  or (p_foams and p_package<>'WHOLE_HOME_3BR')
  or (p_guests>v_cap and not(p_package='WHOLE_HOME_3BR' and p_foams)) then raise check_violation using message='Ineligible package occupancy'; end if;
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

create function ten29_private.owner_rate_state(p_package public.booking_package_code,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_head uuid; v_history jsonb;
begin
 perform ten29_private.require_pricing_owner();
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise check_violation using message='Invalid history offset'; end if;
 select published_revision_id into v_head from public.calendar_rate_heads where package_code=p_package;
 if not found then raise check_violation using message='Invalid package'; end if;
 select coalesce(jsonb_agg(to_jsonb(v) order by v.revision desc),'[]'::jsonb) into v_history from
  (select id,revision,status,base_revision_id,created_at,published_at,ten29_private.rate_rules_json(id) as rules
   from public.calendar_rate_revisions where package_code=p_package order by revision desc limit 30 offset p_offset) v;
 return jsonb_build_object('package_code',p_package,'published_revision_id',v_head,
  'published_rules',ten29_private.rate_rules_json(v_head),'history',v_history);
end $$;

-- Calendar rates and per-booking adjustments stay separate in an immutable quote.
create function ten29_private.prepare_priced_quote(p_request uuid,p_expected_rate uuid,p_deposit bigint,p_adjustments jsonb,
 p_manual_nights jsonb,p_security_deposit bigint,p_conditions text,p_valid_until timestamptz,p_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare req public.booking_requests; prices jsonb; night jsonb; manual jsonb; adj jsonb; items jsonb:='[]'; adjustments jsonb:='[]';
 subtotal bigint:=0; charges bigint:=0; discounts bigint:=0; line bigint; amount bigint; v_source text; v_id uuid; v_revision integer;
 v_snapshot jsonb; existing public.booking_quotes; current_rate uuid; n integer; saved_input jsonb;
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
 prices:=ten29_private.read_prices(req.package_code,req.check_in_date,req.check_out_date,req.overnight_guest_count,req.folding_foams_requested);
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
 insert into public.booking_quotes(idempotency_key,request_id,revision,amount_total,required_deposit_amount,valid_until,line_items)
 values(p_key,p_request,v_revision,amount::numeric/100,p_deposit::numeric/100,p_valid_until,items) returning id into v_id;
 insert into public.booking_quote_pricing_snapshots(quote_id,breakdown,created_by) values(v_id,v_snapshot,auth.uid());
 return v_id;
end $$;

create function ten29_private.issue_priced_quote(p_quote uuid) returns uuid language plpgsql security definer set search_path='' as $$
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
 update public.booking_quotes set status='ISSUED',owner_approved_by=auth.uid(),owner_approved_at=clock_timestamp(),issued_by=auth.uid(),issued_at=clock_timestamp() where id=q.id;
 if req.status<>'QUOTED' then update public.booking_requests set status='QUOTED' where id=req.id; end if;
 return q.id;
end $$;

create function ten29_private.read_quote_breakdown(p_quote uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.booking_quotes; req public.booking_requests; snapshot jsonb; paid bigint;
begin
 perform ten29_private.require_pricing_owner();
 select * into q from public.booking_quotes where id=p_quote;
 if not found then raise check_violation using message='Quote not found'; end if;
 select * into req from public.booking_requests where id=q.request_id;
 select breakdown-'owner_input' into snapshot from public.booking_quote_pricing_snapshots where quote_id=q.id;
 select (coalesce(sum(d.amount),0)*100)::bigint into paid from public.booking_deposits d
 join public.booking_deposit_verifications v on v.deposit_id=d.id and v.decision='VERIFIED' where d.request_id=req.id;
 if snapshot is null then snapshot:=jsonb_build_object('legacy',true,'currency',q.currency,
  'booking',jsonb_build_object('reference',req.id,'package_code',req.package_code,'guest_count',req.overnight_guest_count,
   'check_in_date',req.check_in_date,'check_out_date',req.check_out_date,'nights',req.check_out_date-req.check_in_date,
   'bedrooms_opened',(select bedrooms_access from public.property_packages where code=req.package_code)),
  'accommodation',jsonb_build_object('nights','[]'::jsonb,'subtotal_centavos',null),'adjustments','[]'::jsonb,
  'additional_charges_centavos',null,'discounts_centavos',null,'final_total_centavos',(q.amount_total*100)::bigint,
  'payment',jsonb_build_object('required_down_payment_centavos',(q.required_deposit_amount*100)::bigint,'refundable_security_deposit_centavos',null,'conditions',null)); end if;
 return snapshot||jsonb_build_object('quote_id',q.id,'revision',q.revision,'status',q.status,'verified_payments_centavos',paid,
  'remaining_balance_centavos',case when q.amount_total is null then null else greatest(q.amount_total*100-paid,0)::bigint end,
  'overpayment_centavos',case when q.amount_total is null then null else greatest(paid-q.amount_total*100,0)::bigint end);
end $$;

-- Public invoker wrappers expose only the intended RPC surface, never private helpers.
create function public.save_calendar_rate_draft(p_package public.booking_package_code,p_base uuid,p_rules jsonb,p_key uuid) returns uuid
 language sql security invoker set search_path='' as $$ select ten29_private.save_rates(p_package,p_base,p_rules,p_key); $$;
create function public.publish_calendar_rate_revision(p_revision uuid,p_base uuid,p_key uuid) returns uuid
 language sql security invoker set search_path='' as $$ select ten29_private.publish_rates(p_revision,p_base,p_key); $$;
create function public.read_owner_rate_state(p_package public.booking_package_code,p_offset integer default 0) returns jsonb
 language sql stable security invoker set search_path='' as $$ select ten29_private.owner_rate_state(p_package,p_offset); $$;
create function public.read_public_calendar_prices(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean) returns jsonb
 language sql stable security invoker set search_path='' as $$ select ten29_private.read_prices(p_package,p_from,p_to,p_guests,p_foams); $$;
create function public.prepare_itemized_booking_quote(p_request uuid,p_expected_rate uuid,p_deposit bigint,p_adjustments jsonb,p_manual_nights jsonb,
 p_security_deposit bigint,p_conditions text,p_valid_until timestamptz,p_key uuid) returns uuid language sql security invoker set search_path='' as $$
 select ten29_private.prepare_priced_quote(p_request,p_expected_rate,p_deposit,p_adjustments,p_manual_nights,p_security_deposit,p_conditions,p_valid_until,p_key); $$;
create function public.issue_itemized_booking_quote(p_quote uuid) returns uuid language sql security invoker set search_path='' as $$ select ten29_private.issue_priced_quote(p_quote); $$;
create function public.read_owner_quote_breakdown(p_quote uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select ten29_private.read_quote_breakdown(p_quote); $$;

alter table public.calendar_rate_heads enable row level security;
alter table public.calendar_rate_revisions enable row level security;
alter table public.calendar_rate_rules enable row level security;
alter table public.calendar_rate_events enable row level security;
alter table public.booking_quote_pricing_snapshots enable row level security;
revoke all on public.calendar_rate_heads,public.calendar_rate_revisions,public.calendar_rate_rules,public.calendar_rate_events,public.booking_quote_pricing_snapshots from public,anon,authenticated;
grant select on public.calendar_rate_heads,public.calendar_rate_revisions,public.calendar_rate_rules,public.calendar_rate_events,public.booking_quote_pricing_snapshots to authenticated;
create policy "Owner reads rate heads" on public.calendar_rate_heads for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads rate revisions" on public.calendar_rate_revisions for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads rate rules" on public.calendar_rate_rules for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads rate audit" on public.calendar_rate_events for select to authenticated using(public.is_ten29_owner());
create policy "Owner reads quote breakdown" on public.booking_quote_pricing_snapshots for select to authenticated using(public.is_ten29_owner());
revoke all on function ten29_private.require_pricing_owner(),ten29_private.validate_rate_rules(jsonb),ten29_private.rate_rules_json(uuid),
 ten29_private.save_rates(public.booking_package_code,uuid,jsonb,uuid),ten29_private.publish_rates(uuid,uuid,uuid),ten29_private.guard_rate_revision(),ten29_private.guard_rate_rule_insert(),
 ten29_private.resolve_rate(uuid,date),ten29_private.read_prices(public.booking_package_code,date,date,integer,boolean),ten29_private.owner_rate_state(public.booking_package_code,integer),
 ten29_private.prepare_priced_quote(uuid,uuid,bigint,jsonb,jsonb,bigint,text,timestamptz,uuid),ten29_private.issue_priced_quote(uuid),ten29_private.read_quote_breakdown(uuid)
 from public,anon,authenticated;
grant execute on function ten29_private.save_rates(public.booking_package_code,uuid,jsonb,uuid),ten29_private.publish_rates(uuid,uuid,uuid),
 ten29_private.owner_rate_state(public.booking_package_code,integer),ten29_private.prepare_priced_quote(uuid,uuid,bigint,jsonb,jsonb,bigint,text,timestamptz,uuid),
 ten29_private.issue_priced_quote(uuid),ten29_private.read_quote_breakdown(uuid) to authenticated;
grant execute on function ten29_private.read_prices(public.booking_package_code,date,date,integer,boolean) to anon,authenticated;
revoke all on function public.save_calendar_rate_draft(public.booking_package_code,uuid,jsonb,uuid),public.publish_calendar_rate_revision(uuid,uuid,uuid),
 public.read_owner_rate_state(public.booking_package_code,integer),public.read_public_calendar_prices(public.booking_package_code,date,date,integer,boolean),
 public.prepare_itemized_booking_quote(uuid,uuid,bigint,jsonb,jsonb,bigint,text,timestamptz,uuid),public.issue_itemized_booking_quote(uuid),public.read_owner_quote_breakdown(uuid)
 from public,anon,authenticated;
grant execute on function public.save_calendar_rate_draft(public.booking_package_code,uuid,jsonb,uuid),public.publish_calendar_rate_revision(uuid,uuid,uuid),
 public.read_owner_rate_state(public.booking_package_code,integer),public.prepare_itemized_booking_quote(uuid,uuid,bigint,jsonb,jsonb,bigint,text,timestamptz,uuid),
 public.issue_itemized_booking_quote(uuid),public.read_owner_quote_breakdown(uuid) to authenticated;
grant execute on function public.read_public_calendar_prices(public.booking_package_code,date,date,integer,boolean) to anon,authenticated;
