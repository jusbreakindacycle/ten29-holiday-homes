begin;
select no_plan();
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000061','authenticated','authenticated','pricing-owner@example.invalid','',now()),
 ('00000000-0000-4000-8000-000000000062','authenticated','authenticated','pricing-manager@example.invalid','',now()),
 ('00000000-0000-4000-8000-000000000063','authenticated','authenticated','pricing-outsider@example.invalid','',now());
insert into public.ten29_admins(user_id,role) values('00000000-0000-4000-8000-000000000061','OWNER'),('00000000-0000-4000-8000-000000000062','MANAGER');
create function pg_temp.rule(k text,a bigint,w integer default null,s date default null,e date default null) returns jsonb language sql as $$
 select jsonb_build_object('kind',k,'amount_centavos',a,'weekday',w,'start_date',s,'end_date',e); $$;
-- Business-calculation fixture helper; direct guest RPC access is tested separately below.
create function pg_temp.read_rates(p_package public.booking_package_code,p_from date,p_to date,p_guests integer,p_foams boolean)
returns jsonb language sql security definer set search_path='' as $$
 select ten29_private.read_prices(p_package,p_from,p_to,p_guests,p_foams); $$;
create temporary table f(name text primary key,id uuid,key uuid default gen_random_uuid(),publish_key uuid default gen_random_uuid());
grant all on f to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
select is(public.read_public_promotion_teaser('WHOLE_HOME_1BR','2032-12-30','2032-12-31'),null::jsonb,'no configured promotion returns no promotional amount');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-30','2033-01-02',1,false)->>'missing_rates')::boolean,true,'no rates are seeded');
select is(pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-30','2033-01-02',1,false)->'estimated_total_centavos','null'::jsonb,'missing price is not zero');
insert into f(name) values('one'),('two'),('three'),('new-three'),('stale');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(
 pg_temp.rule('DEFAULT',10001),pg_temp.rule('WEEKDAY',12003,extract(dow from date '2032-12-24')::integer),
 pg_temp.rule('RANGE',20005,null,'2032-12-30','2033-01-03'),pg_temp.rule('DATE',30007,null,'2032-12-31','2033-01-01')),key) where name='one';
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-30','2033-01-02',1,false)->>'missing_rates')::boolean,true,'saved draft remains invisible publicly');
select lives_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(
 pg_temp.rule('DEFAULT',10001),pg_temp.rule('WEEKDAY',12003,extract(dow from date '2032-12-24')::integer),
 pg_temp.rule('RANGE',20005,null,'2032-12-30','2033-01-03'),pg_temp.rule('DATE',30007,null,'2032-12-31','2033-01-01')),key) from f where name='one'$$,'draft save is idempotent');
select is((select count(*)::integer from public.calendar_rate_revisions),1,'draft retry creates no extra version');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',99999)),key) from f where name='one'$$,
 '23514','Idempotency key was already used','save key cannot alter draft body');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('RANGE',100,null,'2032-01-01','2032-01-10'),pg_temp.rule('RANGE',200,null,'2032-01-05','2032-01-15')),gen_random_uuid())$$,
 '23P01',null,'ambiguous equal-priority ranges rejected');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',100),pg_temp.rule('DEFAULT',200)),gen_random_uuid())$$,
 '23505',null,'duplicate default rejected');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('WEEKDAY',100)),gen_random_uuid())$$,
 '23514',null,'weekday requires explicit day');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[{"kind":"DEFAULT","amount_centavos":1.5}]',gen_random_uuid())$$,
 '23514','Invalid rate rule fields','fractional centavos rejected');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[{"kind":"DEFAULT","amount_centavos":1,"approved":true}]',gen_random_uuid())$$,
 '23514','Invalid rate rule fields','client publication/approval flag rejected');
select is((select count(*)::integer from public.calendar_rate_revisions),1,'invalid rule transactions leave no partial revisions');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',11001)),key) where name='stale';
select public.publish_calendar_rate_revision(id,null,publish_key) from f where name='one';
select is((public.read_owner_rate_state('WHOLE_HOME_1BR',1)->'history'->0->>'revision')::integer,1,'owner can page older revisions without losing history');
select lives_ok($$select public.publish_calendar_rate_revision(id,null,publish_key) from f where name='one'$$,'publication retry is idempotent');
select is((select count(*)::integer from public.calendar_rate_events where event='PUBLISHED'),1,'publication audit emitted once');
select throws_ok($$select public.publish_calendar_rate_revision(id,null,publish_key) from f where name='stale'$$,
 '23514','Rates changed; reload before publishing','stale competing revision rejected');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',123)),gen_random_uuid())$$,
 '23514','Rates changed; reload before saving','stale editor save rejected');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-23','2032-12-24',1,false)->>'estimated_total_centavos')::bigint,10001::bigint,'default nightly rate resolves');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-24','2032-12-25',1,false)->>'estimated_total_centavos')::bigint,12003::bigint,'weekday override resolves');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-30','2032-12-31',1,false)->>'estimated_total_centavos')::bigint,20005::bigint,'date-range override outranks weekday/default');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-31','2033-01-01',1,false)->>'estimated_total_centavos')::bigint,30007::bigint,'single-date override outranks range');
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-30','2033-01-02',1,false)->>'estimated_total_centavos')::bigint,70017::bigint,'mixed nights cross month/year with exact arithmetic');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_2BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',40009)),key) where name='two';
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_3BR',null,jsonb_build_array(pg_temp.rule('DEFAULT',50011)),key) where name='three';
select public.publish_calendar_rate_revision(id,null,publish_key) from f where name in ('two','three');
select is((pg_temp.read_rates('WHOLE_HOME_2BR','2033-01-01','2033-01-02',2,false)->>'estimated_total_centavos')::bigint,40009::bigint,'2BR has separate package price');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)->>'estimated_total_centavos')::bigint,50011::bigint,'two guests pay chosen 3BR price without per-person multiplication');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',8,true)->>'estimated_total_centavos')::bigint,50011::bigint,'approved 8-guest bedding invents no fee');
insert into f(name) values('promo-future'),('promo-active'),('promo-next');
select throws_ok($$select public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,60000,'2033-01-01','2033-01-15',2,7,now(),now()+interval '2 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',gen_random_uuid())$$,
 '23514','Invalid promotion terms','equal former and promotional prices rejected by database');
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,45000,'2033-02-01','2033-02-15',2,7,now()+interval '1 day',now()+interval '2 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',key) where name='promo-future';
select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='promo-future';
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04'),null::jsonb,'promotion before its start is not public');
select public.deactivate_calendar_promotion('WHOLE_HOME_3BR',(select id from f where name='promo-future'));
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,45000,'2033-02-01','2033-02-15',2,7,now()-interval '1 day',now()+interval '7 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',key) where name='promo-active';
select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='promo-active';
select is((public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04')->>'promotional_amount_centavos')::bigint,45000::bigint,'eligible package and date window returns approved per-night teaser');
select is(public.read_public_promotion_teaser('WHOLE_HOME_2BR','2033-02-02','2033-02-04'),null::jsonb,'promotion is isolated to its configured package');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-15','2033-02-17'),null::jsonb,'stay outside eligible date range receives no teaser');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-03'),null::jsonb,'stay below minimum nights receives no teaser');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-02-02','2033-02-04',2,false)->'nights'->0->>'amount_centavos')::bigint,45000::bigint,'same promotion amount drives internal nightly price calculation');
set local role anon;
select is((public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04')->>'promotional_amount_centavos')::bigint,45000::bigint,'anonymous caller may read only the eligible teaser projection');
select ok(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04')::text !~ 'former_price_evidence|standard|history|owner_input|adjustments|guest|payment','public teaser omits private rate and booking data');
select throws_ok($$select public.read_public_calendar_prices('WHOLE_HOME_3BR','2033-02-02','2033-02-04',2,false)$$,'42501',null,'anonymous caller cannot read schedule despite knowing eligible dates');
reset role;
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_1BR','2033-01-01','2033-01-02',3,false)$$,'23514','Ineligible package occupancy','pricing cannot bypass capacity');
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',8,false)$$,'23514','Ineligible package occupancy','pricing enforces foam arrangement');
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2035-01-02',1,false)$$,'23514','Price window must be between 1 and 366 nights','public price read bounded');
select throws_ok($$insert into public.calendar_rate_rules(revision_id,position,kind,amount_centavos) select id,99,'DEFAULT',1 from f where name='one'$$,'42501',null,'owner cannot directly mutate published rule tables');

insert into public.booking_requests(id,source,package_code,check_in_date,check_out_date,overnight_guest_count)
 values('00000000-0000-4000-8000-000000000064','PHONE','WHOLE_HOME_3BR','2032-12-31','2033-01-02',2),
 ('00000000-0000-4000-8000-000000000065','PHONE','WHOLE_HOME_3BR','2033-02-02','2033-02-04',2);
update public.booking_requests set status='REVIEWING' where id='00000000-0000-4000-8000-000000000064';
update public.booking_requests set status='REVIEWING' where id='00000000-0000-4000-8000-000000000065';
insert into f(name) values('quote-one'),('quote-two');
update f set id=public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',(select id from f where name='three'),1000,
 '[{"type":"CHARGE","description":"Individual arrangement","quantity":2,"unit_amount_centavos":100,"reason":"Owner decision for this request"},
 {"type":"DISCOUNT","description":"Individual discount","quantity":1,"unit_amount_centavos":50,"reason":"Owner decision for this request"}]',
 '[]',500,'Privately agreed conditions',null,key) where name='quote-one';
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->'accommodation'->>'subtotal_centavos')::bigint,100022::bigint,'nightly accommodation subtotal exact');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->>'final_total_centavos')::bigint,100172::bigint,'charge and discount affect accommodation total correctly');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->>'discounts_centavos')::bigint,50::bigint,'discount recorded as reduction');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->'adjustments'->1->>'line_total_centavos')::bigint,(-50)::bigint,'discount line is negative');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->'payment'->>'required_down_payment_centavos')::bigint,1000::bigint,'down payment kept separate from total');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->'payment'->>'refundable_security_deposit_centavos')::bigint,500::bigint,'refundable security deposit separately recorded');
select is(public.read_owner_quote_breakdown((select id from f where name='quote-one'))->'adjustments'->0->>'approved_by','00000000-0000-4000-8000-000000000061','adjustment approval attributed by database owner identity');
select public.issue_itemized_booking_quote(id) from f where name='quote-one';
select lives_ok($$select public.issue_itemized_booking_quote(id) from f where name='quote-one'$$,'itemized quote issuance retry safe');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_3BR',(select id from f where name='three'),jsonb_build_array(pg_temp.rule('DEFAULT',60013)),key) where name='new-three';
select public.publish_calendar_rate_revision(id,(select id from f where name='three'),publish_key) from f where name='new-three';
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)->>'estimated_total_centavos')::bigint,60013::bigint,'next read sees new publication immediately');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-one'))->>'final_total_centavos')::bigint,100172::bigint,'rate edits do not change issued quote');
select throws_ok($$select public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',(select id from f where name='three'),1000,'[]','[]',null,null,null,gen_random_uuid())$$,
 '23514','Rates changed; review the current estimate','stale estimate cannot become authoritative quote silently');
select throws_ok($$select public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',(select id from f where name='new-three'),1000,
 '[{"type":"CHARGE","description":"Forged approval","quantity":1,"unit_amount_centavos":1,"reason":"x","approved":true}]','[]',null,null,null,gen_random_uuid())$$,
 '23514','Invalid owner adjustment','client approval flag rejected even on owner foundation API');
update f set id=public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',(select id from f where name='new-three'),1000,'[]','[]',null,null,null,key) where name='quote-two';
select is((select revision::integer from public.booking_quotes where id=(select id from f where name='quote-two')),2,'new quote revision preserves old history');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-two'))->>'final_total_centavos')::bigint,120026::bigint,'new quote uses new nightly sources with no invented adjustment');
select public.issue_itemized_booking_quote(id) from f where name='quote-two';
update public.booking_requests set status='AWAITING_DEPOSIT' where id='00000000-0000-4000-8000-000000000064';
insert into public.booking_deposits(request_id,amount) values('00000000-0000-4000-8000-000000000064',10);
select public.decide_booking_deposit(id,'VERIFIED',true,gen_random_uuid()) from public.booking_deposits where request_id='00000000-0000-4000-8000-000000000064';
select throws_ok($$select public.confirm_booking_reservation('00000000-0000-4000-8000-000000000064',(select id from f where name='quote-one'),gen_random_uuid())$$,
 '23514','An applicable owner-issued quote with required down payment is required','confirmation requires applicable issued quote revision');
select lives_ok($$select public.confirm_booking_reservation('00000000-0000-4000-8000-000000000064',(select id from f where name='quote-two'),gen_random_uuid())$$,'priced quotation integrates with protected confirmation');
select is((public.read_owner_quote_breakdown((select id from f where name='quote-two'))->>'remaining_balance_centavos')::bigint,119026::bigint,'verified deposit reduces remaining balance, not quotation charges');
select throws_ok($$select public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',(select id from f where name='new-three'),1000,'[]','[]',null,null,null,gen_random_uuid())$$,
 '23514','Request is not eligible for a new quote','confirmed financial agreement cannot be replaced');
update f set id=public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000065',(select id from f where name='three'),10000,'[]','[]',null,'Promotion applies to the eligible whole-house package and nights',null,key) where name='promo-next';
select is((public.read_owner_quote_breakdown((select id from f where name='promo-next'))->'accommodation'->>'subtotal_centavos')::bigint,90000::bigint,'owner quotation uses the approved promotional amount for eligible nights');
select is(public.read_owner_quote_breakdown((select id from f where name='promo-next'))->'promotion'->>'id',(select id::text from f where name='promo-active'),'quotation records the promotion applied');
select public.issue_itemized_booking_quote(id) from f where name='promo-next';
select public.deactivate_calendar_promotion('WHOLE_HOME_3BR',(select id from f where name='promo-active'));
select is((public.read_owner_quote_breakdown((select id from f where name='promo-next'))->'accommodation'->>'subtotal_centavos')::bigint,90000::bigint,'deactivating a promotion does not rewrite an issued quote snapshot');
insert into f(name) values('canonical');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_1BR',(select id from f where name='one'),'[{"kind":"DEFAULT","amount_centavos":1}]',key) where name='canonical';
select lives_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',(select id from f where name='one'),'[{"kind":"DEFAULT","amount_centavos":1}]',key) from f where name='canonical'$$,'raw OWNER RPC retry canonicalizes optional null fields');
select is((select count(*)::integer from public.calendar_rate_revisions where save_key=(select key from f where name='canonical')),1,'canonicalized retry does not duplicate a draft');
insert into public.booking_quotes(request_id,revision,currency,amount_total) values('00000000-0000-4000-8000-000000000064',3,'USD',1);
select throws_ok($$select public.read_owner_quote_breakdown(id) from public.booking_quotes where currency='USD'$$,
 '23514','This preview supports PHP quotations only; the historical record is unchanged','foreign historical currency is never mislabeled or converted into PHP');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
select is((select count(*)::integer from public.calendar_rate_revisions),0,'manager cannot read draft/history tables');
select throws_ok($$select public.publish_calendar_rate_revision(id,null,publish_key) from f where name='stale'$$,'42501','TEN29 owner authorization required','manager cannot publish');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[]',gen_random_uuid())$$,'42501','TEN29 owner authorization required','manager cannot write drafts');
select throws_ok($$select public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',null,1,'[]','[]',null,null,null,gen_random_uuid())$$,
 '42501','TEN29 owner authorization required','manager cannot authorize private adjustments');
select throws_ok($$select public.read_owner_quote_breakdown(id) from f where name='quote-one'$$,'42501','TEN29 owner authorization required','manager cannot access pricing approval breakdown');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000063',true);
select is((select count(*)::integer from public.booking_quote_pricing_snapshots),0,'nonmember cannot read private quote adjustments');
select throws_ok($$select public.read_owner_rate_state('WHOLE_HOME_1BR')$$,'42501','TEN29 owner authorization required','nonmember denied owner state RPC');
set local role anon;
select throws_ok($$select * from public.calendar_rate_rules$$,'42501',null,'anonymous users cannot enumerate drafts');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[]',gen_random_uuid())$$,'42501',null,'anonymous write denied');
select throws_ok($$select public.publish_calendar_rate_revision(gen_random_uuid(),null,gen_random_uuid())$$,'42501',null,'anonymous publication denied');
select throws_ok($$select public.read_public_calendar_prices('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)$$,'42501',null,'anonymous callers cannot read the full nightly rate schedule');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04'),null::jsonb,'deactivated promotion is no longer public');
reset role;
select throws_ok($$update public.booking_quote_pricing_snapshots set breakdown='{}'$$,'23514','Booking history is immutable','financial breakdown immutable even to maintenance role');
select throws_ok($$update public.calendar_rate_rules set amount_centavos=1$$,'23514','Booking history is immutable','published rate rules cannot be rewritten');
select throws_ok($$update public.booking_quotes set amount_total=1 where status='ISSUED'$$,'23514','Quote snapshots are immutable','old issued quote values remain protected');
select * from finish(); rollback;
