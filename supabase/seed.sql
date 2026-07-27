-- Local development seed only. Contains fabricated placeholder data —
-- never real guest information. Do not run against production.

insert into public.inquiries (
  reference_code, source, full_name, email, mobile_number,
  check_in_date, check_out_date, adults, children, day_visitors, vehicles,
  purpose_of_stay, message, privacy_consent, status, notification_status
) values
  (
    'TEN29-20260801-DEV1', 'website', 'Test Guest One', 'test.guest1@example.com',
    '+639170000001', current_date + interval '14 days', current_date + interval '16 days',
    4, 1, 0, 1, 'Family reunion', 'Sample seed record for local development.',
    true, 'NEW', 'SENT'
  ),
  (
    'TEN29-20260801-DEV2', 'facebook', 'Test Guest Two', null,
    '+639170000002', current_date + interval '30 days', current_date + interval '31 days',
    2, 0, 0, 1, 'Weekend getaway', 'Another sample seed record.',
    true, 'CONTACTED', 'SENT'
  )
on conflict (reference_code) do nothing;
