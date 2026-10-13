alter table public.booking_properties
  add column max_overnight_guests smallint not null default 8
  constraint booking_properties_max_overnight_guests_check check (max_overnight_guests = 8);

update public.property_packages
set max_guests = case code
  when 'WHOLE_HOME_1BR' then 2
  when 'WHOLE_HOME_2BR' then 4
  when 'WHOLE_HOME_3BR' then 6
end;

alter table public.property_packages
  alter column max_guests set not null,
  add constraint property_packages_owner_capacity_check check (
    (code = 'WHOLE_HOME_1BR' and max_guests = 2)
    or (code = 'WHOLE_HOME_2BR' and max_guests = 4)
    or (code = 'WHOLE_HOME_3BR' and max_guests = 6)
  );

alter table public.booking_requests
  add column overnight_guest_count smallint null,
  add column folding_foams_requested boolean not null default false,
  add constraint booking_requests_overnight_guest_count_check check (
    overnight_guest_count is null or overnight_guest_count between 1 and 8
  ),
  add constraint booking_requests_package_capacity_check check (
    overnight_guest_count is null
    or (package_code = 'WHOLE_HOME_1BR' and overnight_guest_count <= 2 and not folding_foams_requested)
    or (package_code = 'WHOLE_HOME_2BR' and overnight_guest_count <= 4 and not folding_foams_requested)
    or (package_code = 'WHOLE_HOME_3BR' and (
      overnight_guest_count <= 6 or (overnight_guest_count <= 8 and folding_foams_requested)
    ))
  );

create function public.guard_booking_request_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_max smallint;
  v_package_max smallint;
begin
  if not public.is_ten29_admin() then
    raise insufficient_privilege using message = 'TEN29 administrator authorization required';
  end if;

  if new.overnight_guest_count is null then
    raise check_violation using message = 'Overnight guest count is required for new booking requests';
  end if;

  select p.max_overnight_guests into v_property_max
  from public.booking_properties p
  where p.id = new.property_id;

  select p.max_guests into v_package_max
  from public.property_packages p
  where p.property_id = new.property_id and p.code = new.package_code;

  if v_property_max is null or new.overnight_guest_count > v_property_max then
    raise check_violation using message = 'Request exceeds maximum property occupancy';
  end if;

  if v_package_max is null then
    raise check_violation using message = 'Package is not available for this property';
  end if;

  if new.folding_foams_requested and new.package_code <> 'WHOLE_HOME_3BR' then
    raise check_violation using message = 'Folding foams are available within the 3-bedroom package only';
  end if;

  if new.overnight_guest_count > v_package_max
    and not (new.package_code = 'WHOLE_HOME_3BR' and new.folding_foams_requested) then
    raise check_violation using message = 'Request exceeds selected package capacity';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_booking_request_capacity() from public, anon, authenticated;

create trigger booking_requests_capacity_guard
  before insert or update on public.booking_requests
  for each row execute function public.guard_booking_request_capacity();

grant select on public.booking_properties to authenticated;

create policy "TEN29 admins can read booking property capacity"
  on public.booking_properties for select to authenticated
  using (public.is_ten29_admin());

comment on column public.booking_properties.max_overnight_guests is
  'Owner-confirmed total overnight occupancy ceiling. Does not define child counting or daytime visitor rules.';
comment on column public.property_packages.max_guests is
  'Owner-confirmed standard package capacity: 2 for 1BR, 4 for 2BR, 6 for 3BR before optional folding foams.';
comment on column public.booking_requests.overnight_guest_count is
  'Total overnight guest count; child-counting rules are not inferred. Existing requests may remain null until verified.';
comment on column public.booking_requests.folding_foams_requested is
  'Optional additional bedding within WHOLE_HOME_3BR; not separate room inventory and has no assumed fee.';