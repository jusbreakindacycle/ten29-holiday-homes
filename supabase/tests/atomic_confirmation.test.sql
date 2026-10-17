begin;
select no_plan();
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','authenticated','authenticated','owner-slice3@example.invalid','',now()),
 ('00000000-0000-4000-8000-000000000082','authenticated','authenticated','manager-slice3@example.invalid','',now()),
 ('00000000-0000-4000-8000-000000000083','authenticated','authenticated','outsider-slice3@example.invalid','',now());
insert into public.ten29_admins(user_id,role) values
 ('00000000-0000-4000-8000-000000000081','OWNER'),('00000000-0000-4000-8000-000000000082','MANAGER');
create temporary table fixtures(name text primary key, request_id uuid, quote_id uuid, deposit_id uuid,
  decision_key uuid default gen_random_uuid(), confirmation_key uuid default gen_random_uuid());
grant all on fixtures to authenticated;
create function pg_temp.ready_request(p_package public.booking_package_code,p_from date,p_to date,p_count smallint,
  p_amount numeric default 25,p_expiry timestamptz default null)
returns table(request_id uuid,quote_id uuid,deposit_id uuid)
language plpgsql as $$
declare v_request uuid; v_quote uuid; v_deposit uuid;
begin
 insert into public.booking_requests(source,package_code,check_in_date,check_out_date,overnight_guest_count)
 values('PHONE',p_package,p_from,p_to,p_count) returning id into v_request;
 update public.booking_requests set status='REVIEWING' where id=v_request;
 insert into public.booking_quotes(request_id,revision,amount_total,required_deposit_amount,valid_until)
 values(v_request,1,100,25,p_expiry) returning id into v_quote;
 perform public.issue_booking_quote(v_quote);
 update public.booking_requests set status='AWAITING_DEPOSIT' where id=v_request;
 insert into public.booking_deposits(request_id,amount) values(v_request,p_amount) returning id into v_deposit;
 return query select v_request,v_quote,v_deposit;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'upgrade',* from pg_temp.ready_request('WHOLE_HOME_3BR','2027-07-10','2027-07-12',2::smallint);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'conflict',* from pg_temp.ready_request('WHOLE_HOME_1BR','2027-07-10','2027-07-12',2::smallint);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'adjacent',* from pg_temp.ready_request('WHOLE_HOME_1BR','2027-07-12','2027-07-13',1::smallint);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'blocked',* from pg_temp.ready_request('WHOLE_HOME_2BR','2027-07-20','2027-07-22',4::smallint);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'insufficient',* from pg_temp.ready_request('WHOLE_HOME_3BR','2027-07-30','2027-07-31',6::smallint,10);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'expired',* from pg_temp.ready_request('WHOLE_HOME_1BR','2027-08-01','2027-08-02',1::smallint,25,now()-interval '1 day');
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'unverified',* from pg_temp.ready_request('WHOLE_HOME_1BR','2027-08-03','2027-08-04',1::smallint);
insert into fixtures(name,request_id,quote_id,deposit_id)
 select 'rejected',* from pg_temp.ready_request('WHOLE_HOME_1BR','2027-08-05','2027-08-06',1::smallint);
select is((select count(*)::integer from public.read_booking_availability('2027-07-01','2027-09-01')),0,'pending requests never occupy property dates');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='unverified'$$,
 '23514','Required down payment has not been independently verified','unverified deposit does not confirm');
select throws_ok($$select public.decide_booking_deposit(deposit_id,'VERIFIED',false,decision_key) from fixtures where name='upgrade'$$,
 '23514','Independent payment verification and a valid decision are required','receipt screenshot without independent verification is insufficient');
select throws_ok($$select public.decide_booking_deposit(deposit_id,null,true,decision_key) from fixtures where name='upgrade'$$,
 '23514','Independent payment verification and a valid decision are required','null decision rejected');
select public.decide_booking_deposit(deposit_id,'VERIFIED',true,decision_key) from fixtures where name not in ('unverified','rejected');
select public.decide_booking_deposit(deposit_id,'REJECTED',false,decision_key) from fixtures where name='rejected';
select is((select count(*)::integer from public.booking_deposit_verifications),7,'payment decisions are appended separately');
select lives_ok($$select public.decide_booking_deposit(deposit_id,'VERIFIED',true,decision_key) from fixtures where name='upgrade'$$,'matching verification retry succeeds');
select is((select count(*)::integer from public.booking_deposit_verifications),7,'verification retry does not duplicate event');
select throws_ok($$select public.decide_booking_deposit(deposit_id,'REJECTED',false,gen_random_uuid()) from fixtures where name='upgrade'$$,
 '23514','Deposit already has an immutable verification decision','original verification cannot be overwritten');
select is((select count(*)::integer from public.booking_deposits where status='RECORDED_UNVERIFIED' and verified_at is null),8,'all original payment records remain unchanged');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='insufficient'$$,
 '23514','Required down payment has not been independently verified','insufficient verified deposit rejected');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='rejected'$$,
 '23514','Required down payment has not been independently verified','rejected payment never counts');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='expired'$$,
 '23514','An applicable owner-issued quote with required down payment is required','expired quote rejected');
select throws_ok($$select public.confirm_booking_reservation(a.request_id,b.quote_id,a.confirmation_key) from fixtures a,fixtures b where a.name='upgrade' and b.name='adjacent'$$,
 '23514','An applicable owner-issued quote with required down payment is required','quote from another request rejected');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,null) from fixtures where name='upgrade'$$,
 '23514','Quote and idempotency key are required','confirmation requires replay protection');
select lives_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='upgrade'$$,'owner confirms eligible two-guest 3BR purchase');
select is((select package_code::text from public.booking_reservations),'WHOLE_HOME_3BR','confirmation preserves selected larger package');
select is((select verified_deposit_total from public.booking_reservations),25::numeric,'exact verified total snapshotted');
select is((select count(*)::integer from public.property_occupancies),1,'confirmation creates exactly one whole-property occupancy');
select is((select count(*)::integer from public.booking_reservation_events),1,'confirmation audit inserted atomically');
select lives_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='upgrade'$$,'matching confirmation retry succeeds');
select is((select count(*)::integer from public.booking_reservations),1,'confirmation retry does not duplicate reservation');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,gen_random_uuid()) from fixtures where name='upgrade'$$,
 '23514','Request already has a reservation','different confirmation key cannot duplicate request');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='conflict'$$,
 '23P01',null,'1BR cannot overlap confirmed 3BR');
select is((select count(*)::integer from public.booking_reservations),1,'conflict rolls back partial reservation');
select is((select count(*)::integer from public.booking_reservation_events),1,'conflict rolls back partial audit');
select is((select status::text from public.booking_requests where id=(select request_id from fixtures where name='conflict')),'AWAITING_DEPOSIT','conflict preserves unresolved request');
select lives_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='adjacent'$$,'checkout-exclusive spans permit back-to-back bookings');
select throws_ok($$select public.create_booking_owner_block('2027-07-11','2027-07-12',gen_random_uuid())$$,'23P01',null,'owner block also conflicts with reservation');
select throws_ok($$select public.create_booking_owner_block('2027-07-20','2027-07-20',gen_random_uuid())$$,'23514','Valid occupancy interval and idempotency key are required','zero-night block rejected');
select throws_ok($$select public.create_booking_owner_block('2027-07-22','2027-07-20',gen_random_uuid())$$,'23514','Valid occupancy interval and idempotency key are required','reversed block rejected');
create temporary table block_fixture as select gen_random_uuid() as key;
select public.create_booking_owner_block('2027-07-20','2027-07-22',key) from block_fixture;
select lives_ok($$select public.create_booking_owner_block('2027-07-20','2027-07-22',key) from block_fixture$$,'matching owner block retry succeeds');
select throws_ok($$select public.create_booking_owner_block('2027-07-23','2027-07-24',key) from block_fixture$$,'23514','Idempotency key was already used','block key cannot change its interval');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='blocked'$$,'23P01',null,'owner-unavailable block prevents confirmation');
select is((select count(*)::integer from public.booking_reservations),2,'owner block conflict leaves no partial reservation');
select public.release_booking_owner_block(id) from public.property_occupancies where kind='OWNER_BLOCK';
select lives_ok($$select public.release_booking_owner_block(id) from public.property_occupancies where kind='OWNER_BLOCK'$$,'block release is retry safe');
select is((select count(*)::integer from public.property_occupancies where kind='OWNER_BLOCK' and not active),1,'released block retained as history');
select is((select count(*)::integer from public.property_occupancy_events where event='RELEASED'),1,'release audited once');
select lives_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='blocked'$$,'released owner block permits confirmation');
select throws_ok($$select public.release_booking_owner_block(id) from public.property_occupancies where kind='RESERVATION' limit 1$$,
 '23514','Owner block not found','block release cannot cancel reservation');
select throws_ok($$update public.booking_requests set status='WITHDRAWN' where id=(select request_id from fixtures where name='upgrade')$$,
 '23514','Booking request snapshot is immutable','confirmed request cannot be withdrawn underneath occupancy');
select throws_ok($$insert into public.booking_deposit_verifications(idempotency_key,deposit_id,decision,independently_verified,actor_id)
 select gen_random_uuid(),deposit_id,'VERIFIED',true,'00000000-0000-4000-8000-000000000081' from fixtures where name='unverified'$$,
 '42501',null,'owner cannot bypass verification RPC with direct table insert');
select throws_ok($$update public.property_occupancies set active=false$$,'42501',null,'owner cannot release occupancy with direct update');
select throws_ok($$delete from public.booking_deposits$$,'42501',null,'original payment history cannot be deleted by owner');
select throws_ok($$update public.booking_quotes set amount_total=1$$,'42501',null,'owner cannot edit issued quote snapshot directly');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='unverified'$$,
 '42501','TEN29 owner authorization required','manager cannot confirm');
select throws_ok($$select public.decide_booking_deposit(deposit_id,'VERIFIED',true,decision_key) from fixtures where name='unverified'$$,
 '42501','TEN29 owner authorization required','manager cannot verify receipt');
select throws_ok($$select public.create_booking_owner_block('2027-09-01','2027-09-02',gen_random_uuid())$$,
 '42501','TEN29 owner authorization required','manager cannot create owner blocks');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select is((select count(*)::integer from public.property_occupancies),0,'authenticated nonmember cannot read private occupancy');
select is((select count(*)::integer from public.booking_deposit_verifications),0,'authenticated nonmember cannot read payment decisions');
select throws_ok($$select public.confirm_booking_reservation(request_id,quote_id,confirmation_key) from fixtures where name='unverified'$$,
 '42501','TEN29 owner authorization required','nonmember cannot confirm');
set local role anon;
select throws_ok($$select * from public.property_occupancies$$,'42501',null,'anonymous users cannot read private occupancy table');
select throws_ok($$select * from public.booking_deposit_verifications$$,'42501',null,'anonymous users cannot read verification table');
select throws_ok($$select public.confirm_booking_reservation(gen_random_uuid(),gen_random_uuid(),gen_random_uuid())$$,'42501',null,'anonymous confirmation has no execute privilege');
select is((select count(*)::integer from public.read_booking_availability('2027-07-10','2027-07-11')),1,'public availability includes confirmed whole-property stay');
select is((select check_out_date from public.read_booking_availability('2027-07-10','2027-07-11')),'2027-07-11'::date,'public availability clips private full-stay interval');
select is((select array_agg(key order by key) from jsonb_object_keys((select to_jsonb(a) from public.read_booking_availability('2027-07-10','2027-07-11') a)) key),
 array['check_in_date','check_out_date'],'public projection has no identities, status, payment or block reason');
select throws_ok($$select * from public.read_booking_availability('2027-01-01','2029-01-01')$$,'23514','Availability window must be between 1 and 366 nights','public read is bounded');
reset role;
select throws_ok($$update public.booking_reservations set verified_deposit_total=999$$,'23514','Booking history is immutable','reservation snapshot immutable even to privileged maintenance');
select throws_ok($$delete from public.booking_deposit_verifications$$,'23514','Booking history is immutable','verification history immutable even to privileged maintenance');
select throws_ok($$update public.booking_deposits set amount=999$$,'23514','Deposit history is immutable','original payments remain immutable');
select * from finish();
rollback;
