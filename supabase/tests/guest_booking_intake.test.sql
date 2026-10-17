begin;
select no_plan();
create function pg_temp.payload(n text default 'Synthetic Guest',a integer default 2,c integer default 0,pack text default 'WHOLE_HOME_3BR',foam boolean default false) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('full_name',n,'mobile_number','+639171234567','email','synthetic@example.invalid','adults',a,'children',c,'day_visitors',0,'vehicles',0,
 'message','','purpose_of_stay','','privacy_consent',true,'utm_source','fixture','utm_medium','','utm_campaign','',
 'package_code',pack,'folding_foams_requested',foam,'check_in_date',(now() at time zone 'Asia/Manila')::date+20,
 'check_out_date',(now() at time zone 'Asia/Manila')::date+22,'reviewed_estimate',
 public.read_public_calendar_prices(pack::public.booking_package_code,(now() at time zone 'Asia/Manila')::date+20,(now() at time zone 'Asia/Manila')::date+22,a+c,foam)); $$;
create temporary table f(name text primary key, session text default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), key uuid default gen_random_uuid(), payload jsonb, result jsonb);
grant all on f to service_role,authenticated,anon;
insert into f(name,payload) values('valid',pg_temp.payload()),('fault-inquiry',pg_temp.payload('FAULT_INQUIRY')),('fault-request',pg_temp.payload('FAULT_REQUEST')),('fault-outbox',pg_temp.payload('FAULT_OUTBOX'));
reset role;
set local role service_role;
update f set result=public.accept_website_booking(payload,session,key,session) where name='valid';
reset role;
select is((select result->>'outcome' from f where name='valid'),'SAVED','genuine guest is saved without an admin identity');
select is((select count(*)::integer from public.inquiries),1,'one legacy enquiry persisted');
select is((select count(*)::integer from public.booking_requests),1,'one linked request persisted');
select is((select source::text from public.booking_requests),'WEBSITE','authoritative WEBSITE source');
select is((select package_code::text from public.booking_requests),'WHOLE_HOME_3BR','two guests retain purchased 3BR');
select is((select overnight_guest_count::integer from public.booking_requests),2,'overnight count persisted');
select ok((select created_by is null from public.booking_requests),'system intake does not impersonate an owner');
select is((select actor_kind from public.booking_request_events),'WEBSITE_INTAKE','initial audit explicitly attributed');
select is((select count(*)::integer from public.inquiry_audit_events),1,'legacy audit persisted');
select is((select count(*)::integer from public.booking_notification_outbox),2,'owner and optional guest notifications durable');
select is((select count(*)::integer from public.booking_quotes),0,'public estimate does not issue a quote');
select is((select count(*)::integer from public.booking_reservations),0,'request does not confirm occupancy');
select is((select estimate->>'missing_rates' from public.website_booking_intakes),'true','missing-rate indication persisted honestly');
select ok((select i.check_in_date=b.check_in_date and i.check_out_date=b.check_out_date from public.inquiries i join public.booking_requests b on b.inquiry_id=i.id),'dates match');
set local role service_role;
select is((select public.accept_website_booking(payload,session,key,session) from f where name='valid'),(select result from f where name='valid'),'matching retry returns original result');
reset role;
select is((select count(*)::integer from public.booking_requests),1,'retry does not duplicate requests');
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"message":"different"}',session,key,session) from f where name='valid'$$,'23514','Retry does not match the saved request','same key cannot change payload');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"status":"CONFIRMED"}',session,gen_random_uuid(),session) from f where name='valid'$$,'23514',null,'status mass assignment rejected');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"source":"PHONE"}',session,gen_random_uuid(),session) from f where name='valid'$$,'23514',null,'source spoofing rejected');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"adults":9}',session,gen_random_uuid(),session) from f where name='valid'$$,'23514',null,'more than eight rejected');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"privacy_consent":false}',session,gen_random_uuid(),session) from f where name='valid'$$,'23514',null,'consent cannot be forged');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload || '{"children":7}',session,gen_random_uuid(),session) from f where name='valid'$$,'23514',null,'children count toward physical ceiling');
reset role;
reset role;
-- Fault injection is confined to this rollback-only test transaction.
create function pg_temp.fail_intake() returns trigger language plpgsql as $$
begin
 if (tg_table_name='inquiries' and new.full_name='FAULT_INQUIRY')
   or (tg_table_name='booking_requests' and exists(select 1 from public.inquiries where id=new.inquiry_id and full_name='FAULT_REQUEST'))
   or (tg_table_name='booking_notification_outbox' and exists(select 1 from public.inquiries i join public.booking_requests b on b.inquiry_id=i.id where b.id=new.request_id and i.full_name='FAULT_OUTBOX')) then
   raise exception 'synthetic required-write failure';
 end if; return new;
end; $$;
-- Separate functions avoid record-field resolution for unrelated trigger row types.
create function pg_temp.fail_enquiry() returns trigger language plpgsql as $$ begin if new.full_name='FAULT_INQUIRY' then raise exception 'synthetic required-write failure'; end if; return new; end; $$;
create function pg_temp.fail_request() returns trigger language plpgsql security definer as $$ begin if exists(select 1 from public.inquiries where id=new.inquiry_id and full_name='FAULT_REQUEST') then raise exception 'synthetic required-write failure'; end if; return new; end; $$;
create function pg_temp.fail_outbox() returns trigger language plpgsql security definer as $$ begin if exists(select 1 from public.inquiries i join public.booking_requests b on b.inquiry_id=i.id where b.id=new.request_id and i.full_name='FAULT_OUTBOX') then raise exception 'synthetic required-write failure'; end if; return new; end; $$;
create trigger test_enquiry_fault before insert on public.inquiries for each row execute function pg_temp.fail_enquiry();
create trigger test_request_fault before insert on public.booking_requests for each row execute function pg_temp.fail_request();
create trigger test_outbox_fault before insert on public.booking_notification_outbox for each row execute function pg_temp.fail_outbox();
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload,session,key,session) from f where name='fault-inquiry'$$,'P0001','synthetic required-write failure','enquiry failure aborts intake');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload,session,key,session) from f where name='fault-request'$$,'P0001','synthetic required-write failure','request failure rolls back enquiry');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking(payload,session,key,session) from f where name='fault-outbox'$$,'P0001','synthetic required-write failure','outbox failure rolls back both records');
reset role;
select is((select count(*)::integer from public.inquiries),1,'no orphan enquiries from failed attempts');
select is((select count(*)::integer from public.booking_requests),1,'no partial requests from failed attempts');
select is((select count(*)::integer from public.booking_notification_outbox),2,'failed attempts leave no outbox fragments');
set local role service_role;
select lives_ok($$select public.accept_website_booking(pg_temp.payload('Eight Guest Fixture',6,2,'WHOLE_HOME_3BR',true),repeat('c',64),gen_random_uuid(),repeat('c',64))$$,'eight overnight people with foams accepted');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking((select payload from f where name='valid') || '{"adults":8,"folding_foams_requested":false}',repeat('d',64),gen_random_uuid(),repeat('d',64))$$,'23514',null,'eight without additional bedding rejected');
reset role;
set local role service_role;
select throws_ok($$select public.accept_website_booking((select payload from f where name='valid') || '{"package_code":"WHOLE_HOME_1BR","adults":4}',repeat('d',64),gen_random_uuid(),repeat('d',64))$$,'23514',null,'undersized package rejected');
reset role;
set local role service_role;
select is((public.accept_website_booking((select payload from f where name='valid') || '{"reviewed_estimate":{}}',repeat('d',64),gen_random_uuid(),repeat('d',64))->>'outcome'),'PRICE_CHANGED','manipulated prices replaced with explicit review result');
reset role;
select ok((select count(*)=2 from public.booking_requests),'stale estimate creates no request');
set local role service_role;
create temporary table claimed as select public.claim_booking_notification((select (result->>'request_id')::uuid from f where name='valid'),'OWNER') as data;
reset role;
select ok((select data is not null from claimed),'durable task can be leased');
set local role service_role;
select is(public.claim_booking_notification((select (result->>'request_id')::uuid from f where name='valid'),'OWNER'),null::jsonb,'concurrent notification lease prevented');
reset role;
set local role service_role;
select lives_ok($$select public.finish_booking_notification((data->'task'->>'id')::uuid,(data->'task'->>'lease_token')::uuid,false) from claimed$$,'provider failure recorded separately after intake commit');
reset role;
select is((select status from public.booking_notification_outbox where recipient_kind='OWNER' and request_id=(select (result->>'request_id')::uuid from f where name='valid')),'FAILED','notification failure visible');
select is((select count(*)::integer from public.booking_requests),2,'notification failure leaves request intact');
reset role;
update public.booking_notification_outbox set next_attempt_at=now()-interval '1 second' where request_id=(select (result->>'request_id')::uuid from f where name='valid');
reset role;
set local role service_role;
select ok(public.claim_booking_notification((select (result->>'request_id')::uuid from f where name='valid'),'OWNER') is not null,'failed task retryable after backoff');
reset role;
select throws_ok($$select public.finish_booking_notification((data->'task'->>'id')::uuid,(data->'task'->>'lease_token')::uuid,true) from claimed$$,'23514',null,'obsolete worker cannot finish replacement lease');
reset role;
update public.booking_notification_outbox set lease_until=now()-interval '1 second',next_attempt_at=now()-interval '1 second' where request_id=(select (result->>'request_id')::uuid from f where name='valid') and recipient_kind='OWNER';
set local role service_role;
select ok(public.claim_booking_notification((select (result->>'request_id')::uuid from f where name='valid'),'OWNER') is not null,'lost notification worker recovered after lease expiry');
reset role;
select ok((select attempts>=3 from public.booking_notification_outbox where request_id=(select (result->>'request_id')::uuid from f where name='valid') and recipient_kind='OWNER'),'recovered attempt remains auditable');
update public.booking_notification_outbox set lease_until=null,next_attempt_at=now()-interval '1 second',first_attempt_at=now()-interval '24 hours' where request_id=(select (result->>'request_id')::uuid from f where name='valid') and recipient_kind='OWNER';
set local role service_role;
select is(public.claim_booking_notification((select (result->>'request_id')::uuid from f where name='valid'),'OWNER'),null::jsonb,'expired provider deduplication window prevents unsafe resend');
reset role;

reset role;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at) values('00000000-0000-4000-8000-000000000092','authenticated','authenticated','intake-owner@example.invalid','',now());
insert into public.ten29_admins(user_id,role) values('00000000-0000-4000-8000-000000000092','OWNER');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select public.save_calendar_rate_draft('WHOLE_HOME_3BR',null,'[{"kind":"DEFAULT","amount_centavos":12345,"weekday":null,"start_date":null,"end_date":null}]',gen_random_uuid()) as revision \gset
select public.publish_calendar_rate_revision(:'revision',null,gen_random_uuid());
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select is((public.accept_website_booking((select payload from f where name='valid'),repeat('9',64),gen_random_uuid(),repeat('9',64))->>'outcome'),'PRICE_CHANGED','publication since review requires acknowledgement');
reset role;
select is((select count(*)::integer from public.booking_requests),2,'changed published estimate cannot silently persist request');
set local role service_role;
select is((public.accept_website_booking(pg_temp.payload('Published Estimate Guest'),repeat('8',64),gen_random_uuid(),repeat('8',64))->'estimate'->>'estimated_total_centavos'),'24690','accepted estimate computed from current published nightly prices');
reset role;
select is((select estimate->>'estimated_total_centavos' from public.website_booking_intakes where session_hash=repeat('8',64)),'24690','authoritative current estimate snapshot persisted');
select is((select count(*)::integer from public.booking_quotes),0,'published estimate still not an issued quote');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select public.create_booking_owner_block((now() at time zone 'Asia/Manila')::date+20,(now() at time zone 'Asia/Manila')::date+22,gen_random_uuid());
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select is((public.accept_website_booking(pg_temp.payload('Blocked Guest'),repeat('7',64),gen_random_uuid(),repeat('7',64))->>'outcome'),'UNAVAILABLE','owner block is rechecked during intake');
reset role;
select is((select count(*)::integer from public.booking_requests),3,'unavailable intake persists no enquiry/request pair');
-- Bounded abuse attempts give an explicit error result, never a saved reference.
set local role service_role;
select public.accept_website_booking(pg_temp.payload('Quota Guest'),repeat('6',64),gen_random_uuid(),repeat('6',64)) from generate_series(1,10);
reset role;
set local role service_role;
select is((public.accept_website_booking(pg_temp.payload('Quota Guest'),repeat('6',64),gen_random_uuid(),repeat('6',64))->>'outcome'),'RATE_LIMITED','server quota enforced across fresh retry keys');
reset role;
select is((select count(*)::integer from public.booking_requests),3,'quota response is not fabricated success');
insert into f(name,payload) values('long-stay',pg_temp.payload('Long Stay Synthetic Guest') || jsonb_build_object(
'check_in_date',(now() at time zone 'Asia/Manila')::date+100,'check_out_date',(now() at time zone 'Asia/Manila')::date+466,
'reviewed_estimate',public.read_public_calendar_prices('WHOLE_HOME_3BR',(now() at time zone 'Asia/Manila')::date+100,(now() at time zone 'Asia/Manila')::date+466,2,false)));
set local role service_role;
select lives_ok($$select public.accept_website_booking((select payload from f where name='long-stay'),
repeat('5',64),gen_random_uuid(),repeat('5',64))$$,'full bounded nightly breakdown fits atomic intake size limits');
reset role;
set local role anon;
select throws_ok($$select public.accept_website_booking('{}',repeat('a',64),gen_random_uuid(),repeat('b',64))$$,'42501',null,'anon cannot call server intake RPC');
select throws_ok($$select * from public.website_booking_intakes$$,'42501',null,'anon cannot enumerate intake snapshots');
select throws_ok($$select * from public.booking_requests$$,'42501',null,'anon cannot query booking requests');
select throws_ok($$select public.claim_booking_notification(gen_random_uuid(),'OWNER')$$,'42501',null,'anon cannot access email task PII');
select throws_ok($$select public.confirm_booking_reservation(gen_random_uuid(),gen_random_uuid(),gen_random_uuid())$$,'42501',null,'anon cannot confirm');
set local role authenticated;
select throws_ok($$select public.accept_website_booking('{}',repeat('a',64),gen_random_uuid(),repeat('b',64))$$,'42501',null,'authenticated client cannot bypass designated server route');
select is((select count(*)::integer from public.website_booking_intakes),0,'nonmember cannot read private snapshots');
reset role;
select * from finish();
rollback;
