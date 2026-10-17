-- Explicit TEN29 administrator membership. Authenticated Supabase accounts
-- receive no inquiry access unless their auth.users ID is provisioned here.
create table if not exists public.ten29_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ten29_admins enable row level security;

revoke all on table public.ten29_admins from public, anon, authenticated;

create or replace function public.is_ten29_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ten29_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_ten29_admin() from public, anon;
grant execute on function public.is_ten29_admin() to authenticated;

grant select on table public.inquiries to authenticated;
grant update (status, owner_notes, contacted_at, closed_at) on table public.inquiries to authenticated;
grant select on table public.inquiry_audit_events to authenticated;
grant insert (inquiry_id, event_type, previous_value, new_value, actor)
  on table public.inquiry_audit_events to authenticated;

drop policy if exists "authenticated can read inquiries" on public.inquiries;
drop policy if exists "authenticated can update inquiries" on public.inquiries;
drop policy if exists "authenticated can read audit events" on public.inquiry_audit_events;

create policy "TEN29 admins can read inquiries"
  on public.inquiries
  for select
  to authenticated
  using (public.is_ten29_admin());

create policy "TEN29 admins can update inquiries"
  on public.inquiries
  for update
  to authenticated
  using (public.is_ten29_admin())
  with check (public.is_ten29_admin());

create policy "TEN29 admins can read inquiry audit events"
  on public.inquiry_audit_events
  for select
  to authenticated
  using (public.is_ten29_admin());

create policy "TEN29 admins can add inquiry audit events"
  on public.inquiry_audit_events
  for insert
  to authenticated
  with check (public.is_ten29_admin());

comment on table public.ten29_admins is
  'Private TEN29 admin allowlist. Only a trusted database owner may provision membership; no user-facing self-service grant path exists.';

-- Initial admin provisioning (performed by the actual project owner only):
-- 1. Invite/create the owner's Auth account through the trusted Supabase
--    Dashboard. Do not enable public registration for administration.
-- 2. Verify the identity out-of-band and obtain that account's Auth user UUID.
-- 3. As the database owner in the Supabase SQL editor, run:
--    insert into public.ten29_admins (user_id)
--    values ('<verified-auth-user-uuid>')
--    on conflict (user_id) do nothing;
-- Never substitute an email, guessed UUID, service key in application code,
-- or an authenticated end-user session for this owner-controlled step.