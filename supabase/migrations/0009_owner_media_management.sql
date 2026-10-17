-- Private originals and renditions; publication is a revocable database gate.
-- Technical limits are configurable by deployment migration, not commercial policy.
create table public.media_limits (
 id integer primary key check(id=1), photo_bytes bigint not null check(photo_bytes between 1 and 20971520),
 video_bytes bigint not null check(video_bytes between 1 and 52428800), library_bytes bigint not null check(library_bytes>0),
 file_count integer not null check(file_count between 1 and 200)
);
insert into public.media_limits values(1,20971520,52428800,1073741824,200);
alter table public.media_limits enable row level security;
revoke all on public.media_limits from anon,authenticated,service_role;
create table public.property_media (
 id uuid primary key default gen_random_uuid(), property_id integer not null default 1 check(property_id=1),
 kind text not null check(kind in ('PHOTO','VIDEO')), mime text not null,
 bytes bigint not null check(bytes between 1 and 52428800),
 quota_bytes bigint not null default 105906176 check(quota_bytes between 1 and 105906176),
 original_key text not null unique, rendition_key text, poster_key text,
 state text not null default 'UPLOADING' check(state in ('UPLOADING','PROCESSING','READY_FOR_REVIEW','PUBLISHED','UNPUBLISHED','FAILED','ARCHIVED')),
 title text not null default '' check(length(title)<=120), caption text not null default '' check(length(caption)<=500),
 alt text not null default '' check(length(alt)<=250), category text not null default 'Exterior' check(length(category) between 1 and 80),public_claim_id text check(public_claim_id ~ '^CLM-[A-Z]+-[0-9]{3}[A-Z]?$'),
 position integer not null default 0 check(position between 0 and 10000), featured boolean not null default false,
 rights_acknowledged boolean not null default false, processing_info jsonb not null default '{}', failure_code text,
 version integer not null default 1, upload_key uuid not null unique, uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), published_by uuid references auth.users(id), published_at timestamptz,
 lease uuid, lease_until timestamptz, cleaned_at timestamptz,
 check(not featured or (kind='PHOTO' and state='PUBLISHED')),
 check(state <> 'PUBLISHED' or (rendition_key is not null and rights_acknowledged and length(alt)>0))
);
create unique index media_one_cover on public.property_media(property_id) where featured;
create table public.media_audit_events (
 id bigint generated always as identity primary key, media_id uuid not null references public.property_media(id),
 actor uuid references auth.users(id), event text not null, version integer not null, created_at timestamptz not null default now()
);
alter table public.property_media enable row level security;
alter table public.media_audit_events enable row level security;
revoke all on public.property_media, public.media_audit_events from anon, authenticated, service_role;
grant select on public.property_media, public.media_audit_events to authenticated;
create policy media_owner_read on public.property_media for select to authenticated using(public.is_ten29_owner());
create policy media_audit_owner_read on public.media_audit_events for select to authenticated using(public.is_ten29_owner());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('ten29-originals','ten29-originals',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime']),
 ('ten29-renditions','ten29-renditions',false,52428800,array['image/webp','video/mp4']) on conflict(id) do nothing;
create policy media_scoped_original_upload on storage.objects for insert to authenticated with check(
 bucket_id='ten29-originals' and public.is_ten29_owner() and exists(
 select 1 from public.property_media m where m.original_key=name and m.uploaded_by=auth.uid()
 and m.state='UPLOADING'
 and m.created_at > now()-interval '1 hour'));
-- Storage permission probes do not consistently enforce final metadata in the
-- installed provider version. Bucket caps and conservative quota reservations
-- bound quarantine storage; the processor verifies exact bytes before readiness.
-- No public bucket, storage SELECT, UPDATE/upsert, or client rendition write grant.

create function public.owner_media_action(p_action text, p_id uuid, p_version integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.property_media; new_id uuid; key_id uuid; old public.property_media;
begin
 if not public.is_ten29_owner() then raise exception 'OWNER required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(421296);
 if p_action='RESERVE' then
  key_id := (p_data->>'key')::uuid;
  select * into m from public.property_media where upload_key=key_id;
  if found then
   if m.uploaded_by<>auth.uid() or m.bytes<>(p_data->>'bytes')::bigint or m.mime<>p_data->>'mime' then raise exception 'Upload key conflict'; end if;
   return to_jsonb(m);
  end if;
  if (select count(*) from public.property_media where cleaned_at is null)>=(select file_count from public.media_limits where id=1)
   or (select coalesce(sum(quota_bytes),0) from public.property_media where cleaned_at is null)+105906176 >(select library_bytes from public.media_limits where id=1)
   then raise exception 'Media quota reached'; end if;
  if p_data->>'mime' not in ('image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime') then raise exception 'Unsupported type'; end if;
  if (p_data->>'bytes')::bigint > (select case when p_data->>'mime' like 'image/%' then photo_bytes else video_bytes end from public.media_limits where id=1) then raise exception 'File too large'; end if;
  new_id:=gen_random_uuid();
  insert into public.property_media(id,kind,mime,bytes,original_key,upload_key,uploaded_by)
   values(new_id,case when p_data->>'mime' like 'image/%' then 'PHOTO' else 'VIDEO' end,p_data->>'mime',(p_data->>'bytes')::bigint,new_id::text||'/original',key_id,auth.uid()) returning * into m;
 else
  select * into m from public.property_media where id=p_id for update;
  if not found then raise exception 'Media not found'; end if;
  if m.version<>p_version then raise exception 'Stale media revision'; end if;
  if p_action='EDIT' then
   if m.state in ('PUBLISHED','ARCHIVED') then raise exception 'Unpublish before editing'; end if;
   if p_data->>'category' not in ('Exterior','Entrance','Living Area','Kitchen & Dining','Room 1','Room 2','Room 3','Bathrooms','Lanai / Outdoor','Parking','Amenities','Property Tour Videos') then raise exception 'Category requires separate approval'; end if;
   update public.property_media set title=p_data->>'title',caption=p_data->>'caption',alt=p_data->>'alt',category=p_data->>'category',
    position=(p_data->>'position')::integer,rights_acknowledged=(p_data->>'rights')::boolean,public_claim_id=p_data->>'public_claim_id',version=version+1 where id=m.id returning * into m;
  elsif p_action='PUBLISH' then
   if m.state not in ('READY_FOR_REVIEW','UNPUBLISHED') or m.rendition_key is null or not m.rights_acknowledged or m.alt='' then raise exception 'Media is not ready for publication'; end if;
   if not exists(select 1 from storage.objects where bucket_id='ten29-renditions' and name=m.rendition_key)
    or (m.kind='VIDEO' and not exists(select 1 from storage.objects where bucket_id='ten29-renditions' and name=m.poster_key)) then raise exception 'Rendition missing'; end if;
   -- Optional replacement is an atomic visibility swap after validation.
   if p_data->>'replace' is not null then
    select * into old from public.property_media where id=(p_data->>'replace')::uuid for update;
    if old.id is null or old.state<>'PUBLISHED' or old.id=m.id then raise exception 'Invalid replacement'; end if;
    update public.property_media set state='UNPUBLISHED',featured=false,version=version+1 where id=old.id;
    insert into public.media_audit_events(media_id,actor,event,version) values(old.id,auth.uid(),'REPLACED',old.version+1);
   end if;
   update public.property_media set state='PUBLISHED',published_by=auth.uid(),published_at=now(),version=version+1 where id=m.id returning * into m;
  elsif p_action in ('UNPUBLISH','ARCHIVE') then
   if p_action='UNPUBLISH' and m.state<>'PUBLISHED' then raise exception 'Not published'; end if;
   update public.property_media set state=case when p_action='ARCHIVE' then 'ARCHIVED' else 'UNPUBLISHED' end,featured=false,version=version+1 where id=m.id returning * into m;
  elsif p_action='COVER' then
   if m.kind<>'PHOTO' or m.state<>'PUBLISHED' then raise exception 'Cover must be a published photo'; end if;
   insert into public.media_audit_events(media_id,actor,event,version) select id,auth.uid(),'COVER_CLEARED',version+1 from public.property_media where featured and id<>m.id;
   update public.property_media set featured=false,version=version+1 where featured and id<>m.id;
   update public.property_media set featured=true,version=version+1 where id=m.id returning * into m;
  else raise exception 'Invalid media action'; end if;
 end if;
 insert into public.media_audit_events(media_id,actor,event,version) values(m.id,auth.uid(),p_action,m.version);
 return to_jsonb(m);
end $$;
revoke all on function public.owner_media_action(text,uuid,integer,jsonb) from public,anon,service_role;
grant execute on function public.owner_media_action(text,uuid,integer,jsonb) to authenticated;

-- Service worker acquires a bounded lease; late completion cannot resurrect an archive.
create function public.media_worker_action(p_id uuid,p_action text,p_token uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
 declare m public.property_media;
begin
 perform pg_advisory_xact_lock(421296);
 select * into m from public.property_media where id=p_id for update;
 if not found then raise exception 'Media not found'; end if;
 if p_action='CLAIM' then
  if m.state not in ('UPLOADING','FAILED','PROCESSING') or (m.lease_until>now()) then raise exception 'Media processing unavailable'; end if;
  if (select count(*) from public.property_media where lease_until>now())>=2 then raise exception 'Processor busy'; end if;
  update public.property_media set state='PROCESSING',lease=gen_random_uuid(),lease_until=now()+interval '6 minutes',failure_code=null,version=version+1 where id=m.id returning * into m;
 elsif p_action='FINISH' then
  if m.state<>'PROCESSING' or m.lease is distinct from p_token or m.lease_until<=now() then raise exception 'Expired processing lease'; end if;
  if p_data->>'error' is null and (select coalesce(sum(quota_bytes),0) from public.property_media where cleaned_at is null)-m.quota_bytes+m.bytes+coalesce((p_data->'info'->>'output_bytes')::bigint,0) > (select library_bytes from public.media_limits where id=1) then raise exception 'Media quota reached'; end if;
  update public.property_media set state=case when p_data->>'error' is null then 'READY_FOR_REVIEW' else 'FAILED' end,
   rendition_key=p_data->>'rendition',poster_key=p_data->>'poster',processing_info=coalesce(p_data->'info','{}'),
   failure_code=p_data->>'error',quota_bytes=case when p_data->>'error' is null then m.bytes+coalesce((p_data->'info'->>'output_bytes')::bigint,0) else m.quota_bytes end,lease=null,lease_until=null,version=version+1 where id=m.id returning * into m;
 elsif p_action='CLEANED' then
  if m.state<>'ARCHIVED' then raise exception 'Archive before cleanup'; end if;
  if m.lease_until>now() then raise exception 'Processing still finishing; retry cleanup after lease expiry'; end if;
  update public.property_media set cleaned_at=now(),version=version+1 where id=m.id returning * into m;
 elsif p_action='RELEASE_CANCELLED' then
  if m.state<>'ARCHIVED' or m.lease is distinct from p_token then return to_jsonb(m); end if;
  update public.property_media set lease=null,lease_until=null,version=version+1 where id=m.id returning * into m;
 else raise exception 'Invalid worker operation'; end if;
 insert into public.media_audit_events(media_id,event,version) values(m.id,'WORKER_'||p_action,m.version);
 return to_jsonb(m);
end $$;
revoke all on function public.media_worker_action(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.media_worker_action(uuid,text,uuid,jsonb) to service_role;

create function public.read_media_delivery(p_id uuid,p_preview boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.property_media;
begin
 select * into m from public.property_media where id=p_id;
 if m.id is null or (m.state<>'PUBLISHED' and not(p_preview and m.state in ('READY_FOR_REVIEW','UNPUBLISHED'))) then return null; end if;
 return jsonb_build_object('id',m.id,'kind',m.kind,'rendition',m.rendition_key,'poster',m.poster_key,'info',m.processing_info);
end $$;
revoke all on function public.read_media_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.read_media_delivery(uuid,boolean) to service_role;

create function public.read_public_media() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'category',category,'featured',featured,'version',version,'public_claim_id',public_claim_id,'width',processing_info->'width','poster_width',processing_info->'poster_width') order by position,created_at),'[]')
 from public.property_media where state='PUBLISHED';
$$;
revoke all on function public.read_public_media() from public;
grant execute on function public.read_public_media() to anon,authenticated;
