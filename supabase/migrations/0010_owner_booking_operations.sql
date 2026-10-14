-- Slice 7: private manual contacts and append-only operational transitions.
-- Confirmed financial and stay snapshots remain immutable; no commercial policy seeded.
create table public.manual_booking_contacts (
 request_id uuid primary key references public.booking_requests(id) on delete restrict,
 full_name text not null check (char_length(full_name) between 1 and 120),
 contact_number text not null check (char_length(contact_number) between 5 and 40),
 email text check (char_length(email)<=254),
 notes text not null default '' check (char_length(notes)<=2000),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.booking_operation_events (
 id uuid primary key default gen_random_uuid(), key uuid not null unique,
 request_id uuid references public.booking_requests(id) on delete restrict,
 reservation_id uuid references public.booking_reservations(id) on delete restrict,
 action text not null, input jsonb not null, result_id uuid not null,
 reason text not null default '', refund_review_required boolean not null default false,
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create unique index reservation_terminal_event on public.booking_operation_events(reservation_id)
 where action in ('CANCEL','COMPLETE');
alter table public.manual_booking_contacts enable row level security;
alter table public.booking_operation_events enable row level security;
revoke all on public.manual_booking_contacts,public.booking_operation_events from public,anon,authenticated,service_role;
grant select on public.manual_booking_contacts,public.booking_operation_events to authenticated;
create policy contacts_admin_read on public.manual_booking_contacts for select to authenticated using(public.is_ten29_admin());
create policy operations_admin_read on public.booking_operation_events for select to authenticated using(public.is_ten29_admin());
create trigger contacts_immutable before update or delete on public.manual_booking_contacts for each row execute function ten29_private.reject_history_change();
create trigger operations_immutable before update or delete on public.booking_operation_events for each row execute function ten29_private.reject_history_change();

create function ten29_private.booking_operation(p_action text,p_id uuid,p_key uuid,p_data jsonb) returns uuid
 language plpgsql security definer set search_path='' as $$
declare old_event public.booking_operation_events; req public.booking_requests; stay public.booking_reservations;
 result uuid; payload jsonb; event_request uuid; event_reservation uuid; occ uuid;
begin
 if not public.is_ten29_admin() then raise insufficient_privilege using message='TEN29 access required'; end if;
 if p_key is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16384
  or p_action not in ('MANUAL','STATUS','PAYMENT','CANCEL','COMPLETE','NOTIFY_RETRY') then raise check_violation using message='Invalid operation'; end if;
 if p_action in ('CANCEL','COMPLETE') and not public.is_ten29_owner() then raise insufficient_privilege using message='OWNER required'; end if;
 payload:=jsonb_build_object('action',p_action,'id',p_id,'data',p_data);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text,7));
 select * into old_event from public.booking_operation_events where key=p_key;
 if found then
  if old_event.input=jsonb_build_object('digest',encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex')) and old_event.actor_id=auth.uid() then return old_event.result_id; end if;
  raise check_violation using message='Operation key conflict';
 end if;
 if p_action='MANUAL' then
  if p_id is not null or (p_data-array['source','package_code','check_in_date','check_out_date','overnight_guest_count','folding_foams_requested','full_name','contact_number','email','notes'])<>'{}'
   or coalesce(p_data->>'source','') not in ('MESSENGER','PHONE','WALK_IN','EXTERNAL_PLATFORM','OTHER')
   or coalesce(char_length(btrim(p_data->>'full_name')),0) not between 1 and 120
   or coalesce(char_length(btrim(p_data->>'contact_number')),0) not between 5 and 40
   or coalesce(char_length(p_data->>'notes'),0)>2000
   or (p_data->>'check_out_date')::date-(p_data->>'check_in_date')::date>366 then raise check_violation using message='Invalid manual request'; end if;
  insert into public.booking_requests(idempotency_key,source,package_code,check_in_date,check_out_date,overnight_guest_count,folding_foams_requested)
   values(p_key,(p_data->>'source')::public.booking_request_source,(p_data->>'package_code')::public.booking_package_code,
    (p_data->>'check_in_date')::date,(p_data->>'check_out_date')::date,(p_data->>'overnight_guest_count')::smallint,
    (p_data->>'folding_foams_requested')::boolean) returning id into result;
  insert into public.manual_booking_contacts(request_id,full_name,contact_number,email,notes,created_by)
   values(result,btrim(p_data->>'full_name'),btrim(p_data->>'contact_number'),nullif(btrim(p_data->>'email'),''),coalesce(p_data->>'notes',''),auth.uid());
  event_request:=result;
 elsif p_action in ('STATUS','PAYMENT','NOTIFY_RETRY') then
  select * into req from public.booking_requests where id=p_id for update;
  if not found then raise check_violation using message='Request not found'; end if;
  event_request:=req.id;
  if p_action='NOTIFY_RETRY' then
   if p_data<>'{}'::jsonb then raise check_violation using message='Invalid retry'; end if;
   result:=req.id;
  elsif p_action='STATUS' then
   if (p_data-array['status','expected_status'])<>'{}' or req.status::text is distinct from p_data->>'expected_status' then
    raise check_violation using message='Request changed; reload'; end if;
   update public.booking_requests set status=(p_data->>'status')::public.booking_request_status where id=req.id;
   result:=req.id;
  else
   if exists(select 1 from public.booking_reservations where request_id=req.id) then raise check_violation using message='Confirmed payment history cannot be extended through deposit intake'; end if;
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
 jsonb_build_object('digest',encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex')),result,coalesce(p_data->>'reason',''),p_action='CANCEL',auth.uid());
 return result;
end $$;
-- Compare canonical payload digest without retaining duplicate private contact data.
-- The wrapper replaces retry reads with the same digest contract.
create function public.perform_booking_operation(p_action text,p_id uuid,p_key uuid,p_data jsonb) returns uuid
 language sql security invoker set search_path='' as $$ select ten29_private.booking_operation(p_action,p_id,p_key,p_data); $$;

create function ten29_private.read_booking_operations(p_from date,p_to date,p_request uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare ids uuid[];
begin
 if not public.is_ten29_admin() then raise insufficient_privilege using message='TEN29 access required'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>366 then raise check_violation using message='Invalid calendar range'; end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into ids from (select id from public.booking_requests
  where (p_request is not null and id=p_request) or (p_request is null and check_in_date<p_to and check_out_date>p_from)
  order by created_at desc limit 1000) x;
 return jsonb_build_object('owner',public.is_ten29_owner(),'requests',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object(
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
 'block_events',coalesce((select jsonb_agg(e order by created_at desc) from public.property_occupancy_events e where occupancy_id in(select id from public.property_occupancies where check_in_date<p_to and check_out_date>p_from)),'[]'),
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('request_id',request_id,'recipient_kind',recipient_kind,'status',status,'attempts',attempts,'first_attempt_at',first_attempt_at)) from public.booking_notification_outbox where request_id=any(ids)),'[]'),
 'estimates',coalesce((select jsonb_agg(jsonb_build_object('request_id',request_id,'estimate',estimate)) from public.website_booking_intakes where request_id=any(ids)),'[]'));
end $$;
create function public.read_booking_operations(p_from date,p_to date,p_request uuid) returns jsonb
 language sql stable security invoker set search_path='' as $$ select ten29_private.read_booking_operations(p_from,p_to,p_request); $$;
revoke all on function ten29_private.booking_operation(text,uuid,uuid,jsonb),ten29_private.read_booking_operations(date,date,uuid),
 public.perform_booking_operation(text,uuid,uuid,jsonb),public.read_booking_operations(date,date,uuid) from public,anon,authenticated;
grant execute on function ten29_private.booking_operation(text,uuid,uuid,jsonb),ten29_private.read_booking_operations(date,date,uuid),
 public.perform_booking_operation(text,uuid,uuid,jsonb),public.read_booking_operations(date,date,uuid) to authenticated;
