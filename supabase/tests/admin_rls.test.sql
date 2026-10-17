begin;

select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000029', 'authenticated', 'authenticated', 'ten29-admin-test@example.invalid', '', now()),
  ('00000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'ten29-member-test@example.invalid', '', now());

insert into public.ten29_admins (user_id)
values ('00000000-0000-0000-0000-000000000029');

insert into public.inquiries (
  id, reference_code, full_name, mobile_number, check_in_date, check_out_date,
  adults, privacy_consent
)
values (
  '00000000-0000-0000-0000-000000000031', 'TEN29-RLS-TEST-0001', 'RLS Test Guest', '+639170000000', current_date + 1,
  current_date + 2, 1, true
);
insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
select id, 'RLS_TEST', 'test' from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', true);
select is(public.is_ten29_admin(), false, 'authenticated non-member is not a TEN29 admin');
select is((select count(*)::integer from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 0, 'non-admin cannot read guest enquiries');
select is((select count(*)::integer from public.inquiry_audit_events), 0, 'non-admin cannot read inquiry audit events');
update public.inquiries set owner_notes = 'unauthorized'
where reference_code = 'TEN29-RLS-TEST-0001';
select throws_ok(
  $$insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
    values ('00000000-0000-0000-0000-000000000031', 'UNAUTHORIZED_TEST', 'non-admin')$$,
  '42501', null, 'non-admin cannot add audit events'
);
select throws_ok(
  $$insert into public.ten29_admins (user_id) values ('00000000-0000-0000-0000-000000000030')$$,
  '42501', null, 'authenticated users cannot grant themselves admin membership'
);
reset role;

set local role anon;
select throws_ok(
  $$select * from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'$$,
  '42501', null, 'unauthenticated anon role cannot read guest enquiries'
);
select throws_ok(
  $$select * from public.inquiry_audit_events$$,
  '42501', null, 'unauthenticated anon role cannot read audit events'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000029', true);
select is(public.is_ten29_admin(), true, 'explicitly provisioned TEN29 admin is authorized');
select is((select count(*)::integer from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 1, 'authorized admin can read guest enquiries');
select is((select owner_notes from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), null, 'non-admin update left inquiry unchanged');
update public.inquiries set owner_notes = 'authorized'
where reference_code = 'TEN29-RLS-TEST-0001';
select is((select owner_notes from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001'), 'authorized', 'authorized admin can update guest enquiries');
insert into public.inquiry_audit_events (inquiry_id, event_type, actor)
select id, 'AUTHORIZED_TEST', 'admin'
from public.inquiries where reference_code = 'TEN29-RLS-TEST-0001';
select is((select count(*)::integer from public.inquiry_audit_events where event_type = 'AUTHORIZED_TEST'), 1, 'authorized admin can add audit events');
reset role;

select * from finish();
rollback;