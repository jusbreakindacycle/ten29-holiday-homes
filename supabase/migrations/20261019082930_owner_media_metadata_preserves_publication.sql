-- Metadata edits do not change publication. Only explicit PUBLISH changes a draft to public.
create or replace function public.owner_media_action(p_action text, p_id uuid, p_version integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.property_media; new_id uuid; key_id uuid; old public.property_media;
begin
 if not public.is_ten29_owner() then raise exception 'OWNER required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(421296);
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise check_violation; end if;
 if p_action='RESERVE' and (p_data-array['key','mime','bytes'])<>'{}'::jsonb then raise check_violation using message='Only property photo/video uploads are supported'; end if;
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
   if m.state='ARCHIVED' then raise exception 'Archived media cannot be edited'; end if;
   if m.state not in ('UPLOADING','PUBLISHED','READY_FOR_REVIEW','UNPUBLISHED') then raise exception 'Media cannot be edited in this state'; end if;
   if m.state='PUBLISHED' and p_data->>'rights' is distinct from 'true' then raise exception 'Unpublish before removing rights acknowledgement'; end if;
   if p_data->>'category' is null or p_data->>'category' not in ('Exterior','Entrance','Living Area','Kitchen & Dining','Room 1','Room 2','Room 3','Bathrooms','Lanai / Outdoor','Parking','Amenities','Property Tour Videos') then raise exception 'Category requires separate approval'; end if;
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
-- The public projection exposes approved publication fields only; custom alt text remains private.
create or replace function public.read_public_media() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'category',category,'featured',featured,'version',version,'public_claim_id',public_claim_id,'width',processing_info->'width','poster_width',processing_info->'poster_width') order by position,created_at),'[]')
 from public.property_media where state='PUBLISHED';
$$;
