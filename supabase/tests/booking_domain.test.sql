begin;

select plan(31);

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
select is((select max_guests from public.property_packages where code = 'WHOLE_HOME_1BR'), null, 'package capacity remains unapproved and unset');

insert into public.booking_requests (id, inquiry_id, source, package_code, check_in_date, check_out_date)
values (
  '00000000-0000-4000-8000-000000000044',
  '00000000-0000-4000-8000-000000000047',
  'WEBSITE', 'WHOLE_HOME_2BR', date '2027-04-01', date '2027-04-03'
);
select is((select status::text from public.booking_requests where id = '00000000-0000-4000-8000-000000000044'), 'NEW', 'new request starts in NEW');
select is((select count(*)::integer from public.booking_request_events where request_id = '00000000-0000-4000-8000-000000000044'), 1, 'request creation is audited');

select throws_ok(
  $$update public.booking_requests set status = 'AWAITING_DEPOSIT'
    where id = '00000000-0000-4000-8000-000000000044'$$,
  '23514', 'Invalid booking request status transition', 'database rejects skipped request transitions'
);
select throws_ok(
  $$insert into public.booking_requests (inquiry_id, source, package_code, check_in_date, check_out_date)
    values ('00000000-0000-4000-8000-000000000047', 'WEBSITE', 'WHOLE_HOME_1BR', date '2027-04-02', date '2027-04-04')$$,
  '23514', 'Website requests must match a linked website enquiry', 'website request dates must match linked enquiry'
);
select throws_ok(
  $$insert into public.booking_requests (inquiry_id, source, package_code, check_in_date, check_out_date)
    values ('00000000-0000-4000-8000-000000000047', 'MESSENGER', 'WHOLE_HOME_1BR', date '2027-04-01', date '2027-04-03')$$,
  '23514', 'Manual requests cannot link to website enquiries', 'manual source cannot be linked to website enquiry'
);
update public.booking_requests set status = 'REVIEWING'
where id = '00000000-0000-4000-8000-000000000044';
select throws_ok(
  $$update public.booking_requests set status = 'QUOTED'
    where id = '00000000-0000-4000-8000-000000000044'$$,
  '23514', 'An owner-issued quote is required before QUOTED', 'database requires owner-issued quote before QUOTED'
);

insert into public.booking_quotes (id, request_id, revision)
values ('00000000-0000-4000-8000-000000000046', '00000000-0000-4000-8000-000000000044', 1);
select is((select status::text from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), 'DRAFT', 'quote remains a draft');
select is((select amount_total from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), null, 'unapproved price remains null');
select is((select required_deposit_amount from public.booking_quotes where request_id = '00000000-0000-4000-8000-000000000044'), null, 'unapproved deposit policy remains null');

select throws_ok(
  $$insert into public.booking_quotes (request_id, revision, status, amount_total, required_deposit_amount, owner_approved_by, owner_approved_at, issued_by, issued_at)
    values ('00000000-0000-4000-8000-000000000044', 2, 'ISSUED', 100, 50,
      '00000000-0000-4000-8000-000000000041', now(),
      '00000000-0000-4000-8000-000000000041', now())$$,
  '23514', 'Quotes must be created as unapproved drafts', 'quote cannot be issued in this slice'
);

select throws_ok(
  $$select public.issue_booking_quote('00000000-0000-4000-8000-000000000046')$$,
  '42501', 'TEN29 owner authorization required', 'manager cannot issue a quote as the owner'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000041', true);
select throws_ok(
  $$select public.issue_booking_quote('00000000-0000-4000-8000-000000000046')$$,
  '23514', 'Quote must be a draft with owner-approved total and deposit', 'owner cannot issue a quote with unapproved null amounts'
);
insert into public.booking_quotes (id, request_id, revision, amount_total, required_deposit_amount)
values ('00000000-0000-4000-8000-000000000045', '00000000-0000-4000-8000-000000000044', 2, 100, 25);
select public.issue_booking_quote('00000000-0000-4000-8000-000000000045');
select is((select status::text from public.booking_requests where id = '00000000-0000-4000-8000-000000000044'), 'QUOTED', 'owner issuance atomically records quote and advances request');
select is((select owner_approved_by from public.booking_quotes where id = '00000000-0000-4000-8000-000000000045'), '00000000-0000-4000-8000-000000000041'::uuid, 'owner approval is attributed to the owner identity');
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
  '23514', 'Deposits must be recorded as unverified', 'direct payment-verification attempt is blocked'
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