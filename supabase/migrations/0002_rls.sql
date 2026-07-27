-- Row-level security for Option 1 tables.
-- Principle: the anon (public) role has NO direct access to guest data.
-- Public enquiry inserts happen only through a server action using the
-- service-role key (which bypasses RLS entirely) after Zod validation — see
-- src/services/inquiry-service.ts. Only authenticated (admin) sessions can
-- read/update through RLS.

alter table public.inquiries enable row level security;
alter table public.inquiry_audit_events enable row level security;

create policy "authenticated can read inquiries"
  on public.inquiries
  for select
  to authenticated
  using (true);

create policy "authenticated can update inquiries"
  on public.inquiries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can read audit events"
  on public.inquiry_audit_events
  for select
  to authenticated
  using (true);

-- No insert/delete policies are defined for 'anon' or 'authenticated':
-- inserts (guest enquiries) and audit-event writes happen exclusively via the
-- service-role key from server-only code, which bypasses RLS by design.
