import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { processMediaBytes } from './media-processor';
import type { OwnerMedia, PublicMedia, MediaDelivery } from '@/types/media';
import { editMediaSchema, reserveMediaSchema } from '@/lib/media-validation';
import { getPublicClaims } from '@/content/claims';
type Client=Awaited<ReturnType<typeof createSupabaseServerClient>>;
function mediaWorker() {
 return createClient<Database>(getSupabaseUrl(),getSupabaseServiceRoleKey(),{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}});
}
export async function requireMediaOwner(client:Client) {
 const {data:{user},error}=await client.auth.getUser();
 const owner=user && !error ? await client.rpc('is_ten29_owner') : null;
 if(!user || !owner?.data || owner.error) throw Error('OWNER access required');
}
export async function ownerMediaLibrary(client:Client):Promise<OwnerMedia[]> {
 await requireMediaOwner(client);
 const {data,error}=await client.from('property_media').select('*').is('cleaned_at',null).order('position').order('created_at',{ascending:false}).limit(200);
 if(error) throw Error('Media library unavailable'); return data??[];
}
export async function reserveMedia(client:Client,raw:unknown):Promise<OwnerMedia> {
 await requireMediaOwner(client); const data=reserveMediaSchema.parse(raw);
 const result=await client.rpc('owner_media_action',{p_action:'RESERVE',p_id:null,p_version:null,p_data:data});
 if(result.error || !result.data) throw Error('Cannot create upload. Check limits and retry.'); return result.data;
}
export async function changeMedia(client:Client,id:string,version:number,action:string,raw:Record<string,unknown>) {
 await requireMediaOwner(client);
 const data=action==='EDIT'?editMediaSchema.parse(raw):raw;
 if(action==='EDIT' && data.public_claim_id && !getPublicClaims().some(c=>c.id===data.public_claim_id && c.category==='fact')) throw Error('Public caption requires an existing approved factual claim');
 const result=await client.rpc('owner_media_action',{p_action:action,p_id:id,p_version:version,p_data:data});
 if(result.error || !result.data) throw Error('Action rejected. Reload to check the latest state and publication requirements.'); return result.data;
}
export async function processOwnerMedia(client:Client,id:string) {
 await requireMediaOwner(client); const worker=mediaWorker();
 const claim=await worker.rpc('media_worker_action',{p_id:id,p_action:'CLAIM',p_token:null,p_data:{}});
 if(claim.error || !claim.data) throw Error('Already processing or unavailable. Reload to retry.');
 const m=claim.data; const keys:string[]=[];
 try {
  const download=await worker.storage.from('ten29-originals').download(m.original_key);
  if(download.error || !download.data) throw Error('UPLOAD_INCOMPLETE');
  const output=await processMediaBytes(Buffer.from(await download.data.arrayBuffer()),m.mime,m.bytes);
  const prefix=`${m.id}/${m.lease}`; const rendition=`${prefix}/rendition.${output.mime==='image/webp'?'webp':'mp4'}`;
  const poster=output.poster?`${prefix}/poster.webp`:null;
  for(const [key,bytes,mime] of [[rendition,output.rendition,output.mime],...(poster?[[poster,output.poster!,'image/webp']]:[])] as [string,Buffer,string][]) {
   const upload=await worker.storage.from('ten29-renditions').upload(key,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
   if(upload.error) throw Error('RENDITION_UPLOAD_FAILED'); keys.push(key);
  }
  const done=await worker.rpc('media_worker_action',{p_id:id,p_action:'FINISH',p_token:m.lease,p_data:{rendition,poster,info:{...output.info,output_bytes:output.rendition.length+(output.poster?.length??0)}}});
  if(done.error || !done.data) throw Error('PROCESSING_CANCELLED'); return done.data;
 } catch(e) {
  if(keys.length) await worker.storage.from('ten29-renditions').remove(keys);
  const allowed=['UPLOAD_INCOMPLETE','HEIF_DECODER_UNAVAILABLE_OR_INVALID','INVALID_IMAGE','TYPE_MISMATCH','SIZE_MISMATCH','POLYGLOT_TRAILER','INVALID_CONTAINER','UNSUPPORTED_VIDEO','UNSUPPORTED_AUDIO','OUTPUT_TOO_LARGE','VIDEO_PROCESSING_FAILED','VIDEO_PROCESSOR_UNAVAILABLE','RENDITION_UPLOAD_FAILED'];
  const code=e instanceof Error && allowed.includes(e.message)?e.message:'PROCESSING_FAILED';
  await worker.rpc('media_worker_action',{p_id:id,p_action:'FINISH',p_token:m.lease,p_data:{error:code}});
  throw Error(`Processing failed: ${code}. The original remains private.`);
 }
 finally {await worker.rpc('media_worker_action',{p_id:id,p_action:'RELEASE_CANCELLED',p_token:m.lease,p_data:{}});}
}
export async function cleanupArchivedMedia(client:Client,id:string) {
 await requireMediaOwner(client);
 const {data:m,error}=await client.from('property_media').select('*').eq('id',id).single();
 if(error || !m || m.state!=='ARCHIVED') throw Error('Archive before cleanup');
 if(m.lease_until && new Date(m.lease_until).getTime()>Date.now()) throw Error('Processing is finishing. Retry cleanup after a few minutes.');
 const worker=mediaWorker();
 // Includes cancelled worker outputs; use Storage API, never storage.objects mutation.
 const listed=await worker.storage.from('ten29-renditions').list(id,{limit:100});
 if(listed.error) throw Error('Cleanup unavailable. Retry.');
 const paths:string[]=[];
 for(const directory of listed.data??[]) {
  const files=await worker.storage.from('ten29-renditions').list(`${id}/${directory.name}`,{limit:100});
  if(files.error) throw Error('Cleanup unavailable. Retry.');
  paths.push(...(files.data??[]).map(f=>`${id}/${directory.name}/${f.name}`));
 }
 const results=await Promise.all([worker.storage.from('ten29-originals').remove([m.original_key]), ...(paths.length?[worker.storage.from('ten29-renditions').remove(paths)]:[])]);
 if(results.some(r=>r.error)) throw Error('Archived safely; file cleanup failed. Retry cleanup.');
 const done=await worker.rpc('media_worker_action',{p_id:id,p_action:'CLEANED',p_token:null,p_data:{}});
 if(done.error) throw Error('Files removed; quota update pending. Retry cleanup.');
 return {cleaned:true};
}
export async function readPublicMedia():Promise<PublicMedia[]|null> {
 try {
  const client=await createSupabaseServerClient(); const {data,error}=await client.rpc('read_public_media');
  if(error) return null; return data??[];
 } catch { return null; }
}
export async function readMediaDelivery(client:Client,id:string,preview:boolean):Promise<MediaDelivery|null> {
 if(preview) await requireMediaOwner(client);
 const {data,error}=await mediaWorker().rpc('read_media_delivery',{p_id:id,p_preview:preview});
 if(error) throw Error('Media unavailable'); return data;
}
export const mediaUploadId = randomUUID;
