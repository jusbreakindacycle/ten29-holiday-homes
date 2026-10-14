/* eslint-disable @next/next/no-img-element -- private previews must bypass optimizer caches */
'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Upload } from 'tus-js-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MEDIA_CATEGORIES, reserveMediaSchema } from '@/lib/media-validation';
import {referencesHouseRules} from '@/lib/nonstored-rules';
import type { OwnerMedia } from '@/types/media';
const button='min-h-11 rounded-lg border border-forest/25 px-4 py-2 text-sm font-medium disabled:opacity-50';
const subscribe=()=>()=>{};
export function MediaManager({initial,claims}:{initial:OwnerMedia[];claims:Array<{id:string;label:string}>}) {
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [media,setMedia]=useState(initial); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<Array<{name:string;preview:string|null}>>([]);
 useEffect(()=>()=>{for(const f of selected)if(f.preview)URL.revokeObjectURL(f.preview);},[selected]);
 const [progress,setProgress]=useState(''); const active=useRef<Upload|null>(null); const cancel=useRef(false);
 const activeId=useRef<string|null>(null);const rejectUpload=useRef<((reason:Error)=>void)|null>(null);
 async function refresh() { const r=await fetch('/api/admin/media',{cache:'no-store'}); const data=await r.json(); if(!r.ok) throw Error(data.error); setMedia(data.media); return data.media as OwnerMedia[]; }
 async function api(action:string,id?:string,version?:number,data:Record<string,unknown>={}) {
  const r=await fetch('/api/admin/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(id?{id,version}:{}),data})});
  const result=await r.json(); if(!r.ok) throw Error(result.error); return result.media as OwnerMedia;
 }
 async function action(m:OwnerMedia,verb:string,data:Record<string,unknown>={}) {
  setBusy(true); setMessage(''); try { await api(verb,m.id,m.version,data); setMessage(`${verb==='PUBLISH'?'Published':verb==='UNPUBLISH'?'Unpublished':verb==='PROCESS'?'Processed and ready for review':'Saved'}.`); }
  catch(e) {setMessage(e instanceof Error?e.message:'Action failed. Retry.');} finally {await refresh().catch(()=>{});setBusy(false);}
 }
 async function uploadFiles(files:File[]) {
  if(!files.length)return;
  // Before preview URLs, hashes, retry storage, RPC or Storage writes.
  if(files.some(file=>referencesHouseRules(file.name))){setMessage('House Rules must never be uploaded to TEN29. Choose only property photos and videos.');return;}
  if(files.length>10){setSelected([]);setMessage('Choose up to 10 photos per upload batch. No files were uploaded.');return;}
  setBusy(true);setMessage('');cancel.current=false;setSelected(files.slice(0,10).map(file=>({name:file.name,preview:['image/jpeg','image/png','image/webp'].includes(file.type)?URL.createObjectURL(file):null})));
  const client=createSupabaseBrowserClient();
  try {
   const {data:{session}}=await client.auth.getSession(); if(!session) throw Error('Sign in again before uploading.');
   for(const file of files.slice(0,10)) {
    if(cancel.current) break;
    if(!reserveMediaSchema.safeParse({key:crypto.randomUUID(),mime:file.type,bytes:file.size}).success) throw Error(`${file.name}: unsupported type or file size. Photos: 20 MiB; videos: 50 MiB.`);
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const scope=`ten29-upload-${session.user.id}-${file.type}-${digest}`;let key=crypto.randomUUID();
    try {const prior=JSON.parse(sessionStorage.getItem(scope)||'null');const reusable=prior&&Date.now()-prior.at<50*60*1000;if(reusable)key=prior.key;sessionStorage.setItem(scope,JSON.stringify({key,at:reusable?prior.at:Date.now()}));} catch {}
    const raw={key,mime:file.type,bytes:file.size};
    if(!reserveMediaSchema.safeParse(raw).success) throw Error(`${file.name}: unsupported type or file size. Photos: 20 MiB; videos: 50 MiB.`);
    let m=await api('RESERVE',undefined,undefined,raw);activeId.current=m.id;
    if(['READY_FOR_REVIEW','PUBLISHED','UNPUBLISHED'].includes(m.state)){try{sessionStorage.removeItem(scope);}catch{}await refresh();continue;}
    if(m.state!=='UPLOADING'){try{sessionStorage.removeItem(scope);}catch{}throw Error('A previous upload is retained. Retry processing or archive it before uploading again.');}
    m=await api('EDIT',m.id,m.version,{title:file.name.slice(0,120),caption:'',alt:'',category:'Exterior',position:0,rights:false});
    if(cancel.current){await api('ARCHIVE',m.id,m.version);break;}
    setProgress(`${file.name}: preparing upload`); await refresh();
    await new Promise<void>((resolve,reject)=>{
     rejectUpload.current=reject;const u=new Upload(file,{endpoint:`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,headers:{authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'x-upsert':'false'},
      metadata:{bucketName:'ten29-originals',objectName:m.original_key,contentType:file.type,cacheControl:'0'},chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
      fingerprint:async()=>`ten29-${m.id}`,retryDelays:[0,1000,3000,5000],
      onProgress:(sent,total)=>setProgress(`${file.name}: ${Math.round(sent/total*100)}% uploaded`),
      onError:()=>reject(Error('Upload interrupted. The file remains private. Retry processing if upload completed, or archive and select it again.')),
      onSuccess:()=>resolve()});active.current=u;
     void u.findPreviousUploads().then(previous=>{if(cancel.current){reject(Error('Upload cancelled'));return;}if(previous.length)u.resumeFromPreviousUpload(previous[0]);u.start();}).catch(()=>reject(Error('Cannot resume upload. Retry.')));
    });
    active.current=null;
    if(cancel.current) {await api('ARCHIVE',m.id,m.version);break;}
    setProgress(`${file.name}: validating and processing`);
    await api('PROCESS',m.id,m.version);try{sessionStorage.removeItem(scope);}catch{}await refresh();
   }
   setMessage(cancel.current?'Upload cancelled.':'Upload processed. Review the private preview before publication.');
  } catch(e) {setMessage(e instanceof Error?e.message:'Upload failed. Retry.');}
  finally {active.current=null;activeId.current=null;rejectUpload.current=null;setProgress('');setBusy(false);await refresh().catch(()=>{});}
 }
 async function cancelUploads() {
  cancel.current=true; const u=active.current;const id=activeId.current;
  if(u) {await u.abort(true).catch(()=>{}); active.current=null;setProgress('');setBusy(false);setMessage('Upload cancelled. Archive the pending entry to release its quota.');}
  const current=await refresh().catch(()=>[]);
  for(const m of current.filter(m=>m.id===id&&(m.state==='UPLOADING'||m.state==='PROCESSING'))) await api('ARCHIVE',m.id,m.version).catch(()=>{});
  rejectUpload.current?.(Error('Upload cancelled. The original remains private.'));
  await refresh().catch(()=>{});
 }
 const used=media.filter(m=>!m.cleaned_at).reduce((s,m)=>s+m.quota_bytes,0);
 return <div className="space-y-6">
  <p>Upload original TEN29 property media from your phone gallery. Uploading does not publish a file.</p>
  <p className="text-sm">Photo limit: 20 MiB, up to 10 photos per batch. Video limit: 50 MiB / 2 minutes. Library allowance: 200 retained files / 1 GiB. Each unfinished upload reserves 101 MiB for its original and renditions; validation releases unused capacity.</p>
  <p className="text-sm">Used or reserved capacity: {(used/1024/1024).toFixed(1)} MiB. HEIC/HEIF requires a working server decoder; unsupported files stay private.</p>
  <div className="flex flex-wrap gap-3">
   <label className={button}>Add photos<input aria-label="Add photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={!hydrated||busy} className="mt-2 block w-full max-w-64 text-sm" onChange={e=>{void uploadFiles(Array.from(e.target.files??[]));e.target.value='';}} /></label>
   <label className={button}>Add video<input aria-label="Add video" type="file" accept="video/mp4,video/quicktime" disabled={!hydrated||busy} className="mt-2 block w-full max-w-64 text-sm" onChange={e=>{void uploadFiles(Array.from(e.target.files??[]));e.target.value='';}} /></label>
   {busy&&<button className={button} onClick={()=>void cancelUploads()}>Cancel upload</button>}
   <button className={button} onClick={()=>void refresh().catch(()=>setMessage('Library unavailable. Retry.'))}>Refresh library</button>
  </div>
  <p role="status" aria-live="polite">{progress||message}</p>
  {selected.length>0&&<ul className="flex flex-wrap gap-3" aria-label="Selected files">{selected.map((f,i)=><li key={i} className="max-w-40 break-words text-sm">{f.preview&&<img src={f.preview} alt={`Selected ${f.name}`} className="h-20 w-32 rounded object-cover" />}{f.name}</li>)}</ul>}
  {!media.length&&<p>No media uploaded. Public pages will show the honest empty state.</p>}
  <div className="grid items-start gap-5 lg:grid-cols-2">{media.map(m=><MediaCard key={`${m.id}-${m.version}`} media={m} library={media} claims={claims} busy={busy} act={action} />)}</div>
 </div>;
}
function MediaCard({media:m,library,claims,busy,act}:{media:OwnerMedia;library:OwnerMedia[];claims:Array<{id:string;label:string}>;busy:boolean;act:(m:OwnerMedia,verb:string,data?:Record<string,unknown>)=>Promise<void>}) {
 const [title,setTitle]=useState(m.title);const [alt,setAlt]=useState(m.alt);const [caption,setCaption]=useState(m.caption);const [category,setCategory]=useState(m.category);const [position,setPosition]=useState(m.position);const [rights,setRights]=useState(m.rights_acknowledged);const [replacement,setReplacement]=useState('');
 const [claim,setClaim]=useState(m.public_claim_id??'');
 const dirty=title!==m.title||alt!==m.alt||caption!==m.caption||category!==m.category||position!==m.position||rights!==m.rights_acknowledged||claim!==(m.public_claim_id??'');
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const editable=m.state!=='PUBLISHED'&&m.state!=='ARCHIVED'; const ready=['READY_FOR_REVIEW','UNPUBLISHED','PUBLISHED'].includes(m.state);
 const label=`${m.kind==='PHOTO'?'Photo':'Video'} ${m.id.slice(0,8)}`;
 return <article className="min-w-0 rounded-xl border border-border bg-ivory p-4" aria-label={label}>
  <h2 className="text-xl text-forest">{m.title||label}</h2><p className="my-2 text-sm">{m.state} · revision {m.version}{m.featured?' · Homepage cover':''}</p>
  {ready&&(m.kind==='PHOTO'?<a href={`/api/media/${m.id}?preview=1`} target="_blank" rel="noopener"><img className="max-h-64 w-full rounded-lg object-contain" loading="lazy" src={`/api/media/${m.id}?preview=1&poster=1`} alt={m.alt||'Private photo preview'} /></a>:<video className="w-full rounded-lg" controls preload="none" poster={`/api/media/${m.id}?preview=1&poster=1`} src={`/api/media/${m.id}?preview=1`} aria-label={m.alt||'Private video preview'} />)}
  {m.failure_code&&<p role="alert" className="mt-3">{m.failure_code}. This file is private. Retry processing or archive it.</p>}
  <fieldset disabled={!editable||busy} className="mt-4 grid gap-3">
   <label>Title<input className="block min-h-11 w-full rounded border p-2" value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} /></label>
   <label>Accessible description<input className="block min-h-11 w-full rounded border p-2" value={alt} maxLength={250} onChange={e=>setAlt(e.target.value)} /></label>
   <label>Caption<textarea className="block w-full rounded border p-2" value={caption} maxLength={500} onChange={e=>setCaption(e.target.value)} /></label>
   <p className="text-xs">Custom copy is private review metadata until separately approved in the claim registry. Public descriptions use the category; publishing media does not approve new property claims.</p>
   <label>Approved public caption<select className="block min-h-11 w-full rounded border p-2" value={claim} onChange={e=>setClaim(e.target.value)}><option value="">Category description</option>{claims.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label>Category<select className="block min-h-11 w-full rounded border p-2" value={category} onChange={e=>setCategory(e.target.value)}>{MEDIA_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Display order<input className="block min-h-11 w-full rounded border p-2" type="number" min={0} max={10000} value={position} onChange={e=>setPosition(Number(e.target.value))} /></label>
   <label className="flex gap-3"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} />I authorize this actual property media, hold the necessary rights, and confirm it contains no confidential pricing poster or unsupported property claim.</label>
   <button className={button} onClick={()=>void act(m,'EDIT',{title,alt,caption,category,position,rights,public_claim_id:claim||null})}>Save metadata</button>
  </fieldset>
  {dirty&&<p role="status" className="mt-2">Unsaved changes. Save before publication.</p>}
  <div className="mt-4 flex flex-wrap gap-2">
   {['UPLOADING','FAILED','PROCESSING'].includes(m.state)&&<button disabled={busy} className={button} onClick={()=>void act(m,'PROCESS')}>Retry processing</button>}
   {['READY_FOR_REVIEW','UNPUBLISHED'].includes(m.state)&&<>
    <label className="w-full">Replace published media (optional)<select className="block min-h-11 w-full rounded border p-2" value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">Publish separately</option>{library.filter(x=>x.state==='PUBLISHED').map(x=><option key={x.id} value={x.id}>{x.title||x.id.slice(0,8)}</option>)}</select></label>
    <button disabled={busy||dirty||!rights||!alt} className={button} onClick={()=>{if(window.confirm(`Publish ${title||label}? ${replacement?'The selected old media will be unpublished only after this validated replacement is published.':''}`)) void act(m,'PUBLISH',replacement?{replace:replacement}:{});}}>Publish media</button>
   </>}
   {m.state==='PUBLISHED'&&<><button disabled={busy} className={button} onClick={()=>{if(window.confirm('Unpublish this media and revoke public access?')) void act(m,'UNPUBLISH');}}>Unpublish</button>{m.kind==='PHOTO'&&<button disabled={busy} className={button} onClick={()=>void act(m,'COVER')}>Use as homepage cover</button>}</>}
   {m.state!=='ARCHIVED'?<button disabled={busy} className={button} onClick={()=>{if(window.confirm('Archive this media? Public access will stop. File cleanup can be retried separately.')) void act(m,'ARCHIVE');}}>Archive</button>:<button disabled={busy} className={button} onClick={()=>{if(window.confirm('Delete archived original and processed files? This cannot be undone. Audit records remain.')) void act(m,'CLEANUP');}}>Delete archived files</button>}
  </div>
 </article>;
}
