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
select is((pg_temp.read_rates('WHOLE_HOME_1BR','2033-01-01','2033-01-02',3,false)->>'estimated_total_centavos')::bigint,20005::bigint,'1BR approved-extra countable maximum is priced without foams');
select is((pg_temp.read_rates('WHOLE_HOME_2BR','2033-01-01','2033-01-02',5,false)->>'estimated_total_centavos')::bigint,40009::bigint,'2BR approved-extra countable maximum is priced without foams');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)->>'estimated_total_centavos')::bigint,50011::bigint,'two guests pay chosen 3BR price without per-person multiplication');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',8,true)->>'estimated_total_centavos')::bigint,50011::bigint,'approved 8-guest bedding invents no fee');
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_1BR','2032-12-31','2033-01-01',2,true)$$,
 '23514','Ineligible package occupancy','folding foams remain exclusive to the 3-bedroom package');
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_2BR','2032-12-31','2033-01-01',4,true)$$,
 '23514','Ineligible package occupancy','folding foams remain exclusive to the 3-bedroom package for 2BR');
select throws_ok($$select pg_temp.read_rates('WHOLE_HOME_3BR','2032-12-31','2033-01-01',7,false)$$,
 '23514','Ineligible package occupancy','3BR extra-guest occupancy still requires foams');
insert into f(name) values('promo-future'),('promo-active'),('promo-next'),('promo-replacement'),
 ('promo-stale-replacement'),('policy-quote'),('boundary-policy-quote'),('null-promotion-quote'),
 ('late-promotion'),('legacy-promotion-quote'),('stale-rate-quote');
select throws_ok($$select public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,60000,'2033-01-01','2033-01-15',2::smallint,7::smallint,now(),now()+interval '2 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',gen_random_uuid())$$,
 '23514','Invalid promotion terms','equal former and promotional prices rejected by database');
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,45000,'2033-02-01','2033-02-15',2::smallint,7::smallint,now()+interval '1 day',now()+interval '2 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',key) where name='promo-future';
select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='promo-future';
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04'),null::jsonb,'promotion before its start is not public');
select public.deactivate_calendar_promotion('WHOLE_HOME_3BR',(select id from f where name='promo-future'));
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,45000,'2033-02-01','2033-02-15',2::smallint,7::smallint,now()-interval '1 day',now()+interval '7 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',key) where name='promo-active';
select is(public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,45000,'2033-02-01','2033-02-15',2::smallint,7::smallint,
 now()-interval '1 day',now()+interval '7 days','SOLD_WITHIN_90_DAYS','  Recent eligible period  ',' Synthetic evidence ',
 (select key from f where name='promo-active')),
 (select id from f where name='promo-active'),'normalized promotion retry returns original draft');
select throws_ok($$select public.save_calendar_promotion_draft('WHOLE_HOME_3BR',null,60000,44000,'2033-02-01','2033-02-15',2::smallint,7::smallint,
 now()-interval '1 day',now()+interval '7 days','SOLD_WITHIN_90_DAYS','Recent eligible period','Synthetic evidence',key)
 from f where name='promo-active'$$,'23514','Promotion idempotency key was already used','same save key cannot change promotion terms');
select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='promo-active';
select is((public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04')->>'promotional_amount_centavos')::bigint,45000::bigint,'eligible package and date window returns approved per-night teaser');
select is(public.read_public_promotion_teaser('WHOLE_HOME_2BR','2033-02-02','2033-02-04'),null::jsonb,'promotion is isolated to its configured package');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-15','2033-02-17'),null::jsonb,'stay outside eligible date range receives no teaser');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-03'),null::jsonb,'stay below minimum nights receives no teaser');
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-02-02','2033-02-04',2,false)->'nights'->0->>'amount_centavos')::bigint,45000::bigint,'same promotion amount drives internal nightly price calculation');
update f set id=public.perform_booking_operation('MANUAL',null,key,jsonb_build_object(
 'source','PHONE','package_code','WHOLE_HOME_3BR','check_in_date','2033-02-02','check_out_date','2033-02-04',
 'overnight_guest_count',9,'folding_foams_requested',true,'policy_version','TEN29-20261015-v1',
 'adults_count',8,'older_children_count',0,'exempt_children_count',1,'full_name','Synthetic Policy Guest',
 'contact_number','555-0101','email','','notes','')) where name='policy-quote';
select lives_ok($$select public.perform_booking_operation('STATUS',id,gen_random_uuid(),
 '{"status":"REVIEWING","expected_status":"NEW"}') from f where name='policy-quote'$$,'policy request enters owner review');
select throws_ok($$select public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[]','[]',null,'Policy terms approved for this synthetic quote',null,gen_random_uuid())
 from f where name='policy-quote'$$,'23514','OWNER occupancy approval required',
 'extra-guest request without an approval event is rejected');
select throws_ok($$select public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[{"type":"CHARGE","description":"Extra guest","quantity":1,"unit_amount_centavos":40000,"reason":"Duplicate"}]',
 '[]',null,null,null,gen_random_uuid()) from f where name='policy-quote'$$,
 '23514','Use the authoritative extra-guest approval path','promotions cannot bypass approved extra-guest charges');
reset role;
insert into public.booking_policy_events(key,request_id,type,data,actor_id,created_at)
select gen_random_uuid(),id,'EXTRA_APPROVE','{"occupancy_reviewed":true}'::jsonb,
 '00000000-0000-4000-8000-000000000061',clock_timestamp()-interval '2 minutes'
from f where name='policy-quote';
set local role authenticated;
select throws_ok($$select public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[]','[]',null,'Policy terms approved for this synthetic quote',null,gen_random_uuid())
 from f where name='policy-quote'$$,'23514','OWNER occupancy approval required',
 'extra-guest approval with a missing count is rejected');
reset role;
insert into public.booking_policy_events(key,request_id,type,data,actor_id,created_at)
select gen_random_uuid(),id,'EXTRA_APPROVE','{"count":null,"occupancy_reviewed":true}'::jsonb,
 '00000000-0000-4000-8000-000000000061',clock_timestamp()-interval '1 minute'
from f where name='policy-quote';
set local role authenticated;
select throws_ok($$select public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[]','[]',null,'Policy terms approved for this synthetic quote',null,gen_random_uuid())
 from f where name='policy-quote'$$,'23514','OWNER occupancy approval required',
 'extra-guest approval with a JSON null count is rejected');
select public.perform_booking_policy_operation(id,gen_random_uuid(),
 '{"type":"EXTRA_APPROVE","count":2,"occupancy_reviewed":true}') from f where name='policy-quote';
update f set q=public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[]','[]',null,'Policy terms approved for this synthetic quote',null,key) where name='policy-quote';
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'policy'->>'version'),
 'TEN29-20261015-v1','promotion quote preserves active booking-policy version');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'booking'->>'guest_count'),
 '9','quote snapshot retains actual overnight headcount including exempt child');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'policy'->>'countable'),
 '8','commercial price uses countable guest total, not the exempt child');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'policy'->>'actual_occupants'),
 '9','policy snapshot separately records actual occupants');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'accommodation'->>'subtotal_centavos')::bigint,
 90000::bigint,'promotion pricing integrates with countable occupancy and policy-aware quote preparation');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->>'additional_charges_centavos')::bigint,
 160000::bigint,'approved extra-guest charge is retained alongside promotion');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'policy'->>'extra_total_centavos')::bigint,
 160000::bigint,'policy snapshot preserves extra-guest charge calculation');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'payment'->>'required_down_payment_centavos')::bigint,
 75000::bigint,'required 30-percent payment schedule remains enforced');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'payment'->>'refundable_security_deposit_centavos')::bigint,
 200000::bigint,'security deposit remains separate from accommodation revenue');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'payment'->>'boundary_review_required'),
 'false','payment schedule retains boundary-review state');
select throws_ok($$select public.issue_itemized_booking_quote((select q from f where name='policy-quote'))$$,
 '23514','Final OWNER payment authorization required','promotion does not bypass QUOTE_AUTHORIZE');
select public.perform_booking_policy_operation((select q from f where name='policy-quote'),gen_random_uuid(),
 '{"type":"QUOTE_AUTHORIZE","basis_approved":true,"terms_communicated":true,"boundary_reviewed":true}');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='policy-quote'))$$,
 'policy-authorized promotion quote issues successfully');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='policy-quote'))$$,
 'issued policy and promotion quote remains idempotently issuable');
update f set id=public.perform_booking_operation('MANUAL',null,key,jsonb_build_object(
 'source','PHONE','package_code','WHOLE_HOME_3BR',
 'check_in_date',((clock_timestamp() at time zone 'Asia/Manila')::date+7)::text,
 'check_out_date',((clock_timestamp() at time zone 'Asia/Manila')::date+8)::text,
 'overnight_guest_count',2,'folding_foams_requested',false,'policy_version','TEN29-20261015-v1',
 'adults_count',2,'older_children_count',0,'exempt_children_count',0,'full_name','Boundary Policy Guest',
 'contact_number','555-0102','email','','notes','')) where name='boundary-policy-quote';
select public.perform_booking_operation('STATUS',id,gen_random_uuid(),
 '{"status":"REVIEWING","expected_status":"NEW"}') from f where name='boundary-policy-quote';
update f set q=public.prepare_itemized_booking_quote(id,(select id from f where name='three'),null,
 '[]','[]',null,'Seven-day boundary terms',null,key) where name='boundary-policy-quote';
select is((public.read_owner_quote_breakdown((select q from f where name='boundary-policy-quote'))->'payment'->>'notice_days')::integer,
 7,'Manila-time payment schedule detects the seven-day boundary');
select is((public.read_owner_quote_breakdown((select q from f where name='boundary-policy-quote'))->'payment'->>'boundary_review_required'),
 'true','seven-day payment schedule retains required boundary review');
select is((public.read_owner_quote_breakdown((select q from f where name='boundary-policy-quote'))->'payment'->>'required_down_payment_centavos')::bigint,
 50011::bigint,'seven-day boundary defaults to full payment');
select public.perform_booking_policy_operation((select q from f where name='boundary-policy-quote'),gen_random_uuid(),
 '{"type":"QUOTE_AUTHORIZE","basis_approved":true,"terms_communicated":true,"boundary_reviewed":true}');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='boundary-policy-quote'))$$,
 'seven-day quote requires and accepts explicit boundary review authorization');
insert into public.booking_requests(id,source,package_code,check_in_date,check_out_date,overnight_guest_count)
 values('00000000-0000-4000-8000-000000000068','PHONE','WHOLE_HOME_2BR','2033-02-02','2033-02-04',1),
 ('00000000-0000-4000-8000-000000000069','PHONE','WHOLE_HOME_3BR','2033-02-02','2033-02-04',2);
update public.booking_requests set status='REVIEWING'
 where id in ('00000000-0000-4000-8000-000000000068','00000000-0000-4000-8000-000000000069');
update f set q=public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000068',
 (select id from f where name='two'),12003,'[]','[]',0,null,null,key) where name='null-promotion-quote';
select is((public.read_owner_quote_breakdown((select q from f where name='null-promotion-quote'))->'promotion'),
 'null'::jsonb,'new no-promotion quote explicitly snapshots null');
reset role;
insert into public.booking_quotes(request_id,revision,status,currency,amount_total,required_deposit_amount,line_items)
 values('00000000-0000-4000-8000-000000000069',1,'DRAFT','PHP',1000,1,'[]'::jsonb);
insert into public.booking_quote_pricing_snapshots(quote_id,breakdown,created_by)
 select q.id,jsonb_build_object('owner_input',jsonb_build_object('expected_rate',(select id from f where name='three')),
  'booking',jsonb_build_object('guest_count',2),'final_total_centavos',100000),auth.uid()
 from public.booking_quotes q where q.request_id='00000000-0000-4000-8000-000000000069';
update f set q=(select id from public.booking_quotes where request_id='00000000-0000-4000-8000-000000000069')
 where name='legacy-promotion-quote';
set local role authenticated;
select ok(not (public.read_owner_quote_breakdown((select q from f where name='legacy-promotion-quote')) ? 'promotion'),
 'pre-promotion quote retains missing promotion field rather than explicit null');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='legacy-promotion-quote'))$$,
 'legacy quote without promotion field remains issuable while a promotion is active');
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_2BR',null,20000,15000,
 '2033-02-01','2033-02-15',2::smallint,7::smallint,now()-interval '1 day',now()+interval '7 days',
 'SOLD_WITHIN_90_DAYS','Recent eligible period','Late synthetic evidence',key) where name='late-promotion';
select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='late-promotion';
select throws_ok($$select public.issue_itemized_booking_quote((select q from f where name='null-promotion-quote'))$$,
 '23514','The promotion changed or expired; prepare a current quotation',
 'explicit null promotion snapshot is rejected after a promotion becomes active');
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
 ('00000000-0000-4000-8000-000000000065','PHONE','WHOLE_HOME_3BR','2033-02-02','2033-02-04',2),
 ('00000000-0000-4000-8000-000000000070','PHONE','WHOLE_HOME_3BR','2033-01-01','2033-01-02',2);
update public.booking_requests set status='REVIEWING' where id='00000000-0000-4000-8000-000000000064';
update public.booking_requests set status='REVIEWING' where id='00000000-0000-4000-8000-000000000065';
update public.booking_requests set status='REVIEWING' where id='00000000-0000-4000-8000-000000000070';
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
update f set id=public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000070',
 (select id from f where name='three'),1000,'[]','[]',null,null,null,key) where name='stale-rate-quote';
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_3BR',(select id from f where name='three'),jsonb_build_array(pg_temp.rule('DEFAULT',60013)),key) where name='new-three';
select public.publish_calendar_rate_revision(id,(select id from f where name='three'),publish_key) from f where name='new-three';
select is((pg_temp.read_rates('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)->>'estimated_total_centavos')::bigint,60013::bigint,'next read sees new publication immediately');
select throws_ok($$select public.issue_itemized_booking_quote(id) from f where name='stale-rate-quote'$$,
 '23514','Rates changed; prepare a current quotation','draft quote cannot issue against changed rate revision');
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
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',(select id from f where name='promo-active'),
 60000,43000,'2033-02-01','2033-02-15',2::smallint,7::smallint,now()-interval '1 day',now()+interval '7 days',
 'SOLD_WITHIN_90_DAYS','Recent eligible period','Replacement synthetic evidence',key) where name='promo-replacement';
update f set id=public.save_calendar_promotion_draft('WHOLE_HOME_3BR',(select id from f where name='promo-active'),
 60000,42000,'2033-02-01','2033-02-15',2::smallint,7::smallint,now()-interval '1 day',now()+interval '7 days',
 'SOLD_WITHIN_90_DAYS','Recent eligible period','Stale synthetic evidence',key) where name='promo-stale-replacement';
select public.publish_calendar_promotion(id,(select id from f where name='promo-active'),publish_key,true,true)
 from f where name='promo-replacement';
select is((select count(*)::integer from public.calendar_promotion_events
 where promotion_id=(select id from f where name='promo-active') and event='SUPERSEDED'),1,
 'publishing replacement records previous promotion supersession');
select throws_ok($$select public.publish_calendar_promotion(id,(select id from f where name='promo-active'),publish_key,true,true)
 from f where name='promo-stale-replacement'$$,'23514','Promotion changed; reload before publishing',
 'stale promotion base is rejected after replacement');
select is((public.read_owner_quote_breakdown((select id from f where name='promo-next'))->'accommodation'->>'subtotal_centavos')::bigint,
 90000::bigint,'replacing a promotion does not rewrite an already issued quote');
select is((public.read_owner_quote_breakdown((select id from f where name='promo-next'))->'promotion'->>'id'),
 (select id::text from f where name='promo-active'),'issued quote retains its original promotion revision');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'promotion'->>'id'),
 (select id::text from f where name='promo-active'),'issued policy quote retains its original promotion revision');
select is((public.read_owner_quote_breakdown((select q from f where name='policy-quote'))->'accommodation'->>'subtotal_centavos')::bigint,
 90000::bigint,'replacing a promotion does not rewrite the issued policy quote');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='policy-quote'))$$,
 'issued policy quote remains valid after its promotion is superseded');
select lives_ok($$select public.issue_itemized_booking_quote((select q from f where name='legacy-promotion-quote'))$$,
 'issued pre-promotion quote remains valid after active promotion changes');
select public.deactivate_calendar_promotion('WHOLE_HOME_3BR',(select id from f where name='promo-replacement'));
select is((select count(*)::integer from public.calendar_promotion_events
 where promotion_id=(select id from f where name='promo-replacement') and event='DEACTIVATED'),1,
 'deactivation is recorded as a distinct lifecycle event');
insert into f(name) values('canonical');
update f set id=public.save_calendar_rate_draft('WHOLE_HOME_1BR',(select id from f where name='one'),'[{"kind":"DEFAULT","amount_centavos":1}]',key) where name='canonical';
select lives_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',(select id from f where name='one'),'[{"kind":"DEFAULT","amount_centavos":1}]',key) from f where name='canonical'$$,'raw OWNER RPC retry canonicalizes optional null fields');
select is((select count(*)::integer from public.calendar_rate_revisions where save_key=(select key from f where name='canonical')),1,'canonicalized retry does not duplicate a draft');
insert into public.booking_quotes(request_id,revision,currency,amount_total) values('00000000-0000-4000-8000-000000000064',3,'USD',1);
select throws_ok($$select public.read_owner_quote_breakdown(id) from public.booking_quotes where currency='USD'$$,
 '23514','This preview supports PHP quotations only; the historical record is unchanged','foreign historical currency is never mislabeled or converted into PHP');
select ok((select former_price_attested_by is not null and owner_dti_acknowledged_by is not null
 from public.calendar_promotions where id=(select id from f where name='promo-replacement')),
 'published revision stores owner attestation and acknowledgement, not independent DTI verification');
select throws_ok($$update public.calendar_promotions set promotional_amount_centavos=1
 where id=(select id from f where name='promo-active')$$,'23514','Published promotion revisions are immutable',
 'published promotion terms cannot be rewritten');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
select is((select count(*)::integer from public.calendar_rate_revisions),0,'manager cannot read draft/history tables');
select throws_ok($$select public.publish_calendar_rate_revision(id,null,publish_key) from f where name='stale'$$,'42501','TEN29 owner authorization required','manager cannot publish');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[]',gen_random_uuid())$$,'42501','TEN29 owner authorization required','manager cannot write drafts');
select throws_ok($$select public.prepare_itemized_booking_quote('00000000-0000-4000-8000-000000000064',null,1,'[]','[]',null,null,null,gen_random_uuid())$$,
 '42501','TEN29 owner authorization required','manager cannot authorize private adjustments');
select throws_ok($$select public.read_owner_quote_breakdown(id) from f where name='quote-one'$$,'42501','TEN29 owner authorization required','manager cannot access pricing approval breakdown');
select throws_ok($$select public.save_calendar_promotion_draft('WHOLE_HOME_1BR',null,20000,15000,
 '2033-02-01','2033-02-15',2::smallint,7::smallint,now(),now()+interval '1 day','SOLD_WITHIN_90_DAYS','Period','Evidence',gen_random_uuid())$$,
 '42501','TEN29 owner authorization required','manager cannot save promotion drafts');
select throws_ok($$select public.publish_calendar_promotion(id,null,publish_key,true,true) from f where name='late-promotion'$$,
 '42501','TEN29 owner authorization required','manager cannot publish promotions');
select throws_ok($$select public.deactivate_calendar_promotion('WHOLE_HOME_1BR',(select id from f where name='late-promotion'))$$,
 '42501','TEN29 owner authorization required','manager cannot deactivate promotions');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000063',true);
select is((select count(*)::integer from public.booking_quote_pricing_snapshots),0,'nonmember cannot read private quote adjustments');
select throws_ok($$select public.read_owner_rate_state('WHOLE_HOME_1BR')$$,'42501','TEN29 owner authorization required','nonmember denied owner state RPC');
set local role anon;
select throws_ok($$select * from public.calendar_rate_rules$$,'42501',null,'anonymous users cannot enumerate drafts');
select throws_ok($$select public.save_calendar_rate_draft('WHOLE_HOME_1BR',null,'[]',gen_random_uuid())$$,'42501',null,'anonymous write denied');
select throws_ok($$select public.publish_calendar_rate_revision(gen_random_uuid(),null,gen_random_uuid())$$,'42501',null,'anonymous publication denied');
select throws_ok($$select public.save_calendar_promotion_draft('WHOLE_HOME_1BR',null,20000,15000,
 '2033-02-01','2033-02-15',2::smallint,7::smallint,now(),now()+interval '1 day','SOLD_WITHIN_90_DAYS','Period','Evidence',gen_random_uuid())$$,
 '42501',null,'anonymous promotion write denied');
select throws_ok($$select public.publish_calendar_promotion(gen_random_uuid(),null,gen_random_uuid(),true,true)$$,
 '42501',null,'anonymous promotion publication denied');
select throws_ok($$select public.read_owner_promotion_state('WHOLE_HOME_1BR')$$,'42501',null,'anonymous owner promotion state denied');
select throws_ok($$select public.read_public_calendar_prices('WHOLE_HOME_3BR','2033-01-01','2033-01-02',2,false)$$,'42501',null,'anonymous callers cannot read the full nightly rate schedule');
select is(public.read_public_promotion_teaser('WHOLE_HOME_3BR','2033-02-02','2033-02-04'),null::jsonb,'deactivated promotion is no longer public');
reset role;
select throws_ok($$update public.booking_quote_pricing_snapshots set breakdown='{}'$$,'23514','Booking history is immutable','financial breakdown immutable even to maintenance role');
select throws_ok($$update public.calendar_rate_rules set amount_centavos=1$$,'23514','Booking history is immutable','published rate rules cannot be rewritten');
select throws_ok($$update public.booking_quotes set amount_total=1 where status='ISSUED'$$,'23514','Quote snapshots are immutable','old issued quote values remain protected');
select * from finish(); rollback;
