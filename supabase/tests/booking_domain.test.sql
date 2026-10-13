begin;

select plan(41);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-4000-8000-000000000041', 'authenticated', 'authenticated', 'domain-admin@example.invalid', '', now()),
  ('00000000-0000-4000-8000-000000000042', 'authenticated', 'authenticated', 'domain-manager@example.invalid', '', now()),
  ('00000000-0000-4000-8000-000000000043', 'authenticated', 'authenticated', 'domain-member@example.invalid', '', now());

insert into public.inquiries (
  id, reference_code, source, full_name, mobile_number,
  check_in_date, check_out_date, adults, privacy_consent
)
values (
  '00000000-0000-4000-8000-000000000047', 'TEN29-BOOKING-DOMAIN-0001', 'website', 'RLS Guest',
  '+639170000041', date '2027-04-01', date '2027-04-03', 1, true
);

insert into public.ten29_admins (user_id)
values
  ('00000000-0000-4000-8000-000000000041'),
  ('00000000-0000-4000-8000-000000000042');
select is((select role from public.ten29_admins where user_id = '00000000-0000-4000-8000-000000000041'), 'MANAGER', 'existing admin membership defaults to least-privilege manager');
update public.ten29_admins set role = 'OWNER'
where user_id = '00000000-0000-4000-8000-000000000041';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000043', true);
select is((select count(*)::integer from public.booking_requests), 0, 'authenticated non-member cannot read booking requests');
select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date)
    values ('MESSENGER', 'WHOLE_HOME_1BR', date '2027-04-01', date '2027-04-03')$$,
  '42501', null, 'authenticated non-member cannot create booking requests'
);
select is((select count(*)::integer from public.booking_deposits), 0, 'authenticated non-member cannot read deposit records');
reset role;

set local role anon;
select throws_ok(
  $$select * from public.booking_requests$$,
  '42501', null, 'anonymous users cannot read booking requests'
);
select throws_ok(
  $$select * from public.booking_quotes$$,
  '42501', null, 'anonymous users cannot read quotation records'
);
select throws_ok(
  $$select * from public.booking_deposits$$,
  '42501', null, 'anonymous users cannot read payment metadata'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000042', true);
select is(public.is_ten29_owner(), false, 'manager is not implicitly an owner');
select is((select count(*)::integer from public.property_packages where occupancy_scope = 'WHOLE_PROPERTY'), 3, 'all three packages occupy the same whole property');
select is((select count(distinct property_id)::integer from public.property_packages), 1, 'all bedroom packages share one property inventory');
select is((select max_guests::integer from public.property_packages where code = 'WHOLE_HOME_1BR'), 2, '1BR owner-confirmed maximum is 2 guests');
select is((select max_guests::integer from public.property_packages where code = 'WHOLE_HOME_2BR'), 4, '2BR owner-confirmed maximum is 4 guests');
select is((select max_guests::integer from public.property_packages where code = 'WHOLE_HOME_3BR'), 6, '3BR standard owner-confirmed maximum is 6 guests');
select is((select max_overnight_guests::integer from public.booking_properties where id = 1), 8, 'owner-confirmed property maximum is 8 overnight guests');

insert into public.booking_requests (
  source, package_code, check_in_date, check_out_date, overnight_guest_count, folding_foams_requested
)
values
  ('PHONE', 'WHOLE_HOME_1BR', date '2027-04-05', date '2027-04-06', 2, false),
  ('PHONE', 'WHOLE_HOME_2BR', date '2027-04-05', date '2027-04-06', 4, false),
  ('PHONE', 'WHOLE_HOME_3BR', date '2027-04-05', date '2027-04-06', 6, false),
  ('PHONE', 'WHOLE_HOME_3BR', date '2027-04-05', date '2027-04-06', 8, true);
select is((select count(*)::integer from public.booking_requests where check_in_date = date '2027-04-05'), 4, 'database accepts package caps and 3BR foam occupancy up to 8');

select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date, overnight_guest_count)
    values ('PHONE', 'WHOLE_HOME_1BR', date '2027-04-07', date '2027-04-08', 3)$$,
  '23514', 'Request exceeds selected package capacity', 'database rejects 1BR request above 2 guests'
);
select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date, overnight_guest_count)
    values ('PHONE', 'WHOLE_HOME_2BR', date '2027-04-07', date '2027-04-08', 5)$$,
  '23514', 'Request exceeds selected package capacity', 'database rejects 2BR request above 4 guests'
);
select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date, overnight_guest_count)
    values ('PHONE', 'WHOLE_HOME_3BR', date '2027-04-07', date '2027-04-08', 7)$$,
  '23514', 'Request exceeds selected package capacity', 'database requires folding foam option for 7 or 8 guests'
);
select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date, overnight_guest_count, folding_foams_requested)
    values ('PHONE', 'WHOLE_HOME_3BR', date '2027-04-07', date '2027-04-08', 9, true)$$,
  '23514', 'Request exceeds maximum property occupancy', 'database rejects guest count above property ceiling'
);
select throws_ok(
  $$insert into public.booking_requests (source, package_code, check_in_date, check_out_date, overnight_guest_count, folding_foams_requested)
    values ('PHONE', 'WHOLE_HOME_2BR', date '2027-04-07', date '2027-04-08', 4, true)$$,
  '23514', 'Folding foams are available within the 3-bedroom package only', 'database rejects foam option on non-3BR package'
);

insert into public.booking_requests (id, inquiry_id, source, package_code, check_in_date, check_out_date, overnight_guest_count)
values (
  '00000000-0000-4000-8000-000000000044',
  '00000000-0000-4000-8000-000000000047',
  'WEBSITE', 'WHOLE_HOME_2BR', date '2027-04-01', date '2027-04-03', 4
);
select is((select status::text from public.booking_requests where id = '00000000-0000-4000-8000-000000000044'), 'NEW', 'new request starts in NEW');
select is((select count(*)::integer from public.booking_request_events where request_id = '00000000-0000-4000-8000-000000000044'), 1, 'request creation is audited');

select throws_ok(
  $$update public.booking_requests set status = 'AWAITING_DEPOSIT'
    where id = '00000000-0000-4000-8000-000000000044'$$,
  '23514', 'Invalid booking request status transition', 'database rejects skipped request transitions'
);
select throws_ok(
  $$insert into public.booking_requests (inquiry_id, source, package_code, check_in_date, check_out_date, overnight_guest_count)
    values ('00000000-0000-4000-8000-000000000047', 'WEBSITE', 'WHOLE_HOME_1BR', date '2027-04-02', date '2027-04-04', 1)$$,
  '23514', 'Website requests must match a linked website enquiry', 'website request dates must match linked enquiry'
);
select throws_ok(
  $$insert into public.booking_requests (inquiry_id, source, package_code, check_in_date, check_out_date, overnight_guest_count)
    values ('00000000-0000-4000-8000-000000000047', 'MESSENGER', 'WHOLE_HOME_1BR', date '2027-04-01', date '2027-04-03', 1)$$,
  '23514', 'Manual requests cannot link to website enquiries', 'manual source cannot be linked to website enquiry'
);
update public.booking_requests set status = 'REVIEWING'
where id = '00000000-0000-4000-8000-000000000044';
select throws_ok(
  $$update public.booking_requests set status = 'QUOTED'
    where id = '00000000-0000-4000-8000-000000000044'$$,
  '23514', 'An owner-issued quote is required before QUOTED', 'database requires owner-issued quote before QUOTED'
);

insert into public.booking_quotes (request_id, revision)
values ('00000000-0000-4000-8000-000000000044', 1);
select is((select status::text from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), 'DRAFT', 'quote remains a draft');
select is((select amount_total from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), null, 'unapproved price remains null');
select is((select required_deposit_amount from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), null, 'unapproved deposit policy remains null');

select throws_ok(
  $$insert into public.booking_quotes (request_id, revision, status, amount_total, required_deposit_amount, owner_approved_by, owner_approved_at, issued_by, issued_at)
    values ('00000000-0000-4000-8000-000000000044', 2, 'ISSUED', 100, 50,
      '00000000-0000-4000-8000-000000000041', now(),
      '00000000-0000-4000-8000-000000000041', now())$$,
  '42501', null, 'manager cannot directly set quote issue or approval fields'
);

select throws_ok(
  $$select public.issue_booking_quote((select id from public.booking_quotes
    where request_id = '00000000-0000-4000-8000-000000000044' and revision = 1))$$,
  '42501', 'TEN29 owner authorization required', 'manager cannot issue a quote as the owner'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000041', true);
select throws_ok(
  $$select public.issue_booking_quote((select id from public.booking_quotes
    where request_id = '00000000-0000-4000-8000-000000000044' and revision = 1))$$,
  '23514', 'Quote must be a draft with owner-approved total and deposit', 'owner cannot issue a quote with unapproved null amounts'
);
insert into public.booking_quotes (request_id, revision, amount_total, required_deposit_amount)
values ('00000000-0000-4000-8000-000000000044', 2, 100, 25);
select public.issue_booking_quote((select id from public.booking_quotes
  where request_id = '00000000-0000-4000-8000-000000000044' and revision = 2));
select is((select status::text from public.booking_requests where id = '00000000-0000-4000-8000-000000000044'), 'QUOTED', 'owner issuance atomically records quote and advances request');
select is((select owner_approved_by from public.booking_quotes
  where request_id = '00000000-0000-4000-8000-000000000044' and revision = 2),
  '00000000-0000-4000-8000-000000000041'::uuid, 'owner approval is attributed to the owner identity');
update public.booking_requests set status = 'AWAITING_DEPOSIT'
where id = '00000000-0000-4000-8000-000000000044';
select is((select status::text from public.booking_requests where id = '00000000-0000-4000-8000-000000000044'), 'AWAITING_DEPOSIT', 'issued quote enables the awaiting-deposit state');

insert into public.booking_deposits (request_id, amount, external_reference_masked)
values ('00000000-0000-4000-8000-000000000044', 25, '****1234');
select is((select status::text from public.booking_deposits where request_id = '00000000-0000-4000-8000-000000000044'), 'RECORDED_UNVERIFIED', 'deposit is recorded unverified only');
select is((select verified_by from public.booking_deposits where request_id = '00000000-0000-4000-8000-000000000044'), null, 'deposit has no payment verification attribution');
select throws_ok(
  $$insert into public.booking_deposits (request_id, amount, status, verified_by, verified_at)
    values ('00000000-0000-4000-8000-000000000044', 25, 'VERIFIED',
      '00000000-0000-4000-8000-000000000041', now())$$,
  '42501', null, 'authenticated admin cannot set payment verification fields'
);

select throws_ok(
  $$insert into public.booking_reservations (request_id, created_by, confirmed_at)
    values ('00000000-0000-4000-8000-000000000044', '00000000-0000-4000-8000-000000000041', now())$$,
  '42501', null, 'administrator has no reservation insert privilege in this slice'
);
select is((select count(*)::integer from public.booking_reservations), 0, 'no confirmed reservation can be created in this slice');
select is((select count(*)::integer from public.booking_request_events where request_id = '00000000-0000-4000-8000-000000000044'), 4, 'creation and all three state transitions are durably audited');

reset role;
select * from finish();
rollback;