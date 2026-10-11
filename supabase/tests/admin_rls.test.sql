begin;

select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000029', 'authenticated', 'authenticated', 'ten29-admin-test@example.invalid', '', now()),
  ('00000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'ten29-member-test@example.invalid', '', now());

insert into public.ten29_admins (user_id)
values ('00000000-0000-0000-0000-000000000029');

insert into public.inquiries (
  reference_code, full_name, mobile_number, check_in_date, check_out_date,
  adults, privacy_consent
)
values (
  'TEN29-RLS-TEST-0001', 'RLS Test Guest', '+639170000000', current_date + 1,
  current_date + 2, 1, true
);
insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
select id, 'RLS_TEST', 'test' from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', true);
select is(public.is_ten29_admin(), false, 'authenticated non-member is not a TEN29 admin');
select is((select count(*)::integer from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 0, 'non-admin cannot read guest enquiries');
select is((select count(*)::integer from public.inquiry_audit_events), 0, 'non-admin cannot read inquiry audit events');
select is((with changed as (
  update public.inquiries set owner_notes = 'unauthorized' where reference_code = 'TEN29-RLS-TEST-0001' returning 1
) select count(*)::integer from changed), 0, 'non-admin cannot update guest enquiries');
select is((with inserted as (
  insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
  select id, 'UNAUTHORIZED_TEST', 'non-admin'
  from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'
  returning 1
) select count(*)::integer from inserted), 0, 'non-admin cannot add audit events');
select throws_ok(
  $$insert into public.ten29_admins (user_id) values ('00000000-0000-0000-0000-000000000030')$$,
  '42501', null, 'authenticated users cannot grant themselves admin membership'
);
reset role;

set local role anon;
select is((select count(*)::integer from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 0, 'unauthenticated anon role cannot read guest enquiries');
select is((select count(*)::integer from public.inquiry_audit_events), 0, 'unauthenticated anon role cannot read audit events');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000029', true);
select is(public.is_ten29_admin(), true, 'explicitly provisioned TEN29 admin is authorized');
select is((select count(*)::integer from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 1, 'authorized admin can read guest enquiries');
select is((with changed as (
  update public.inquiries set owner_notes = 'authorized' where reference_code = 'TEN29-RLS-TEST-0001' returning 1
) select count(*)::integer from changed), 1, 'authorized admin can update guest enquiries');
select is((with inserted as (
  insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
  select id, 'AUTHORIZED_TEST', 'admin'
  from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'
  returning 1
) select count(*)::integer from inserted), 1, 'authorized admin can add audit events');
reset role;

select * from finish();
rollback;