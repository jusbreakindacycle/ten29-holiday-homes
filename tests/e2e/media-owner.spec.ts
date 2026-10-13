import {test,expect,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const ffmpeg=process.env.TEN29_FFMPEG_PATH || 'ffmpeg';
test.describe('OWNER media with actual disposable Storage',()=>{
 test.skip(process.env.TEN29_PROVIDER_E2E!=='true','Requires disposable Supabase CI fixture');
 test.describe.configure({mode:'serial',retries:0});
 async function login(page:Page,role='OWNER') {
  await page.goto('/admin/login');await page.getByLabel('Email').fill(process.env[`TEN29_E2E_${role}_EMAIL`]!);await page.getByLabel('Password').fill(process.env[`TEN29_E2E_${role}_PASSWORD`]!);
  await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);await page.goto('/admin/media');
  if(role==='OWNER')await expect(page.getByLabel('Add photos',{exact:true})).toBeEnabled();
  page.on('response',async r=>{if(r.url().includes('/storage/v1/upload/')&&r.status()>=400){let code='unknown';try{const b=await r.json();code=String(b.error||b.code||'unknown');}catch{}console.log(`Synthetic Storage upload diagnostic: status ${r.status()}, code ${code}`);}});
 }
 async function metadata(page:Page,title:string) {
  const card=page.getByRole('article').filter({has:page.getByRole('button',{name:'Save metadata'})}).first();
  await card.getByLabel('Title',{exact:true}).fill(title);await card.getByLabel('Accessible description').fill('Synthetic CI test image');await card.getByLabel('Caption',{exact:true}).fill('Private unapproved caption');
  await card.getByLabel('I authorize').check();await card.getByRole('button',{name:'Save metadata'}).click();await expect(page.getByRole('status').first()).toContainText('Saved');
  return page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
 }
 test('mobile photo uploads, private preview, OWNER publication and immediate revocation',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  const jpeg=await sharp({create:{width:96,height:64,channels:3,background:'green'}}).jpeg().withMetadata().toBuffer();
  await page.getByLabel('Add photos',{exact:true}).setInputFiles({name:'synthetic-property.jpg',mimeType:'image/jpeg',buffer:jpeg});
  await expect(page.getByText('Upload processed. Review the private preview before publication.')).toBeVisible({timeout:90000});
  const card=await metadata(page,'Synthetic photo'); const src=await card.locator('img').getAttribute('src');const id=src!.split('/')[3].split('?')[0];
  expect((await request.get(`/api/media/${id}`)).status()).toBe(404);
  page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Publish media'}).click();await expect(page.getByRole('status').first()).toContainText('Published');
  const output=await request.get(`/api/media/${id}`);expect(output.status()).toBe(200);expect(output.headers()['cache-control']).toContain('no-store');
  const image=await sharp(await output.body()).metadata();expect(image.format).toBe('webp');expect(image.exif).toBeUndefined();
  await card.getByRole('button',{name:'Use as homepage cover'}).click();await expect(page.getByRole('status').first()).toContainText('Saved');
  await page.goto('/');await expect(page.locator(`img[src='/api/media/${id}']`).first()).toBeVisible();
  await page.goto('/gallery');await expect(page.locator(`img[src='/api/media/${id}']`)).toBeVisible();await expect(page.getByText('Private unapproved caption')).toHaveCount(0);
  await page.goto('/admin/media');await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/owner-media-mobile.png',fullPage:true});
  for(const width of [768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Unpublish',exact:true}).click();await expect(page.getByRole('status').first()).toContainText('Unpublished');
  expect((await request.get(`/api/media/${id}`)).status()).toBe(404);
 });
 for(const codec of ['libx264','libx265']) test(`actual ${codec==='libx264'?'Android MP4':'MOV HEVC'} upload becomes playable H264`,async({page,request})=>{
  test.setTimeout(120000);await login(page);const folder=await mkdtemp(path.join(tmpdir(),'ten29-fixture-'));const mov=codec==='libx265';const file=path.join(folder,mov?'synthetic.mov':'synthetic.mp4');
  try {
   await promisify(execFile)(ffmpeg!,['-nostdin','-v','error','-f','lavfi','-i','color=c=blue:s=96x64:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v',codec,'-threads','1','-pix_fmt','yuv420p','-c:a','aac','-shortest',...(mov?['-tag:v','hvc1']:[]),file],{timeout:30000,maxBuffer:1024*1024,windowsHide:true});
   await page.getByLabel('Add video',{exact:true}).setInputFiles({name:path.basename(file),mimeType:mov?'video/quicktime':'video/mp4',buffer:await readFile(file)});
   await expect(page.getByText('Upload processed. Review the private preview before publication.')).toBeVisible({timeout:90000});
   const card=await metadata(page,mov?'Synthetic HEVC':'Synthetic MP4');page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Publish media'}).click();await expect(page.getByRole('status').first()).toContainText('Published');
   const video=card.locator('video');await video.evaluate(async(v:HTMLVideoElement)=>{v.muted=true;await v.play();v.pause();});
   const src=await video.getAttribute('src');const id=src!.split('/')[3].split('?')[0];
   const range=await request.get(`/api/media/${id}`,{headers:{Range:'bytes=0-127'}});expect(range.status()).toBe(206);expect(range.headers()['content-type']).toBe('video/mp4');
  } finally {await rm(folder,{recursive:true,force:true});}
 });
 test('manager and anonymous clients cannot upload, enumerate, publish or read private Storage',async({page,request})=>{
  await login(page,'MANAGER');await expect(page.getByRole('main').getByRole('alert')).toContainText('OWNER access required');expect((await request.get('/api/admin/media')).status()).toBe(403);
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  expect((await anon.rpc('owner_media_action',{p_action:'RESERVE',p_id:null,p_version:null,p_data:{}})).error).not.toBeNull();
  expect((await anon.storage.from('ten29-originals').upload('evil/original',Buffer.from('bad'),{contentType:'image/png'})).error).not.toBeNull();
  expect((await anon.from('property_media').select('*')).error).not.toBeNull();
  const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await owner.auth.signInWithPassword({email:process.env.TEN29_E2E_OWNER_EMAIL!,password:process.env.TEN29_E2E_OWNER_PASSWORD!});
  const library=await owner.from('property_media').select('*');expect(library.error).toBeNull();const m=library.data![0];
  expect((await anon.storage.from('ten29-originals').download(m.original_key)).error).not.toBeNull();
  expect((await owner.storage.from('ten29-originals').upload('forged/path',Buffer.from('bad'),{contentType:'image/png'})).error).not.toBeNull();
  expect((await owner.rpc('media_worker_action',{p_id:m.id,p_action:'FINISH',p_token:null,p_data:{}})).error).not.toBeNull();
  const publicRows=await anon.rpc('read_public_media');expect(publicRows.error).toBeNull();expect(JSON.stringify(publicRows.data)).not.toMatch(/original_key|rendition_key|uploaded_by|Private unapproved|failure_code|lease/);
  const manager=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await manager.auth.signInWithPassword({email:process.env.TEN29_E2E_MANAGER_EMAIL!,password:process.env.TEN29_E2E_MANAGER_PASSWORD!});
  expect((await manager.storage.from('ten29-originals').upload(m.original_key,Buffer.from('bad'),{contentType:'image/png'})).error).not.toBeNull();
  expect((await owner.storage.from('ten29-renditions').upload('forged/rendition.webp',Buffer.from('bad'),{contentType:'image/webp'})).error).not.toBeNull();
  expect((await owner.from('property_media').update({state:'PUBLISHED'}).eq('id',m.id)).error).not.toBeNull();
  expect((await owner.storage.from('ten29-originals').upload(m.original_key,Buffer.from('bad'),{contentType:m.mime,upsert:true})).error).not.toBeNull();
  const publicOriginal=await request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ten29-originals/${m.original_key}`);expect(publicOriginal.ok()).toBe(false);
  expect((await request.get(`/api/media/${m.id}?preview=1`)).status()).toBe(404);
  if(m.rendition_key)expect((await anon.storage.from('ten29-renditions').download(m.rendition_key)).error).not.toBeNull();
  const reserve=await owner.rpc('owner_media_action',{p_action:'RESERVE',p_id:null,p_version:null,p_data:{key:crypto.randomUUID(),mime:'image/png',bytes:1}});
  expect(reserve.error).toBeNull();
  const png=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  expect(reserve.data.quota_bytes).toBe(101*1024*1024);
  const uploaded=await owner.storage.from('ten29-originals').upload(reserve.data.original_key,png,{contentType:'image/png'});expect(uploaded.error).toBeNull();
  await login(page);const rejected=await page.context().request.post('/api/admin/media',{headers:{Origin:new URL(page.url()).origin},data:{action:'PROCESS',id:reserve.data.id,version:reserve.data.version,data:{}}});
  expect(rejected.status()).toBe(400);expect((await rejected.json()).error).toContain('SIZE_MISMATCH');
  const retained=await owner.from('property_media').select('*').eq('id',reserve.data.id).single();expect(retained.data!.state).toBe('FAILED');expect(retained.data!.quota_bytes).toBe(101*1024*1024);
  const large=await owner.rpc('owner_media_action',{p_action:'RESERVE',p_id:null,p_version:null,p_data:{key:crypto.randomUUID(),mime:'video/mp4',bytes:50*1024*1024}});expect(large.error).toBeNull();
  expect((await owner.storage.from('ten29-originals').upload(large.data.original_key,Buffer.alloc(51*1024*1024),{contentType:'video/mp4'})).error).not.toBeNull();
  const archived=await owner.rpc('owner_media_action',{p_action:'ARCHIVE',p_id:large.data.id,p_version:large.data.version,p_data:{}});expect(archived.error).toBeNull();
  expect((await page.context().request.post('/api/admin/media',{headers:{Origin:new URL(page.url()).origin},data:{action:'CLEANUP',id:large.data.id,version:archived.data.version,data:{}}})).status()).toBe(200);
 });
 test('real corrupt upload fails processing without public visibility',async({page})=>{
  await login(page);await page.getByLabel('Add photos',{exact:true}).setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0,73,69,78,68,0,0,0,0])});
  await expect(page.getByRole('status').first()).toContainText('INVALID_IMAGE',{timeout:90000});await expect(page.getByRole('article').first()).toContainText('FAILED');
  await expect(page.getByRole('article').first().getByRole('button',{name:'Publish media'})).toHaveCount(0);
 });
 test('multi-photo replacement preserves old publication until atomic swap and cleanup is repeatable',async({page,request})=>{
  await login(page);const first=await sharp({create:{width:48,height:32,channels:3,background:'red'}}).png().toBuffer();const second=await sharp(first).webp().toBuffer();
  await page.getByLabel('Add photos',{exact:true}).setInputFiles([{name:'synthetic-a.png',mimeType:'image/png',buffer:first},{name:'synthetic-b.webp',mimeType:'image/webp',buffer:second}]);
  await expect(page.getByText('Upload processed. Review the private preview before publication.')).toBeVisible({timeout:90000});
  const card=await metadata(page,'Synthetic replacement');await card.getByLabel('Replace published media (optional)').selectOption({label:'Synthetic MP4'});
  const old=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Synthetic MP4',exact:true})});const oldSrc=await old.locator('video').getAttribute('src');const oldId=oldSrc!.split('/')[3].split('?')[0];
  expect((await request.get(`/api/media/${oldId}`)).status()).toBe(200);
  page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Publish media'}).click();await expect(page.getByRole('status').first()).toContainText('Published');expect((await request.get(`/api/media/${oldId}`)).status()).toBe(404);
  page.once('dialog',d=>d.accept());await old.getByRole('button',{name:'Archive',exact:true}).click();await expect(page.getByRole('status').first()).toContainText('Saved');
  page.once('dialog',d=>d.accept());await old.getByRole('button',{name:'Delete archived files'}).click();await expect(page.getByRole('status').first()).toContainText('Saved');
  await expect(old).toHaveCount(0);
  const repeated=await page.context().request.post('/api/admin/media',{headers:{Origin:new URL(page.url()).origin},data:{action:'CLEANUP',id:oldId,version:1,data:{}}});expect(repeated.status()).toBe(200);
 });
 test('actual synthetic HEIC conversion is either decoded or explicitly private and unsupported',async({page})=>{
  await login(page);const folder=await mkdtemp(path.join(tmpdir(),'ten29-heic-'));const file=path.join(folder,'synthetic.heic');
  try {
   const png=path.join(folder,'source.png');await sharp({create:{width:64,height:64,channels:3,background:'blue'}}).png().toFile(png);
   await promisify(execFile)('heif-enc',['-o',file,png],{timeout:30000,maxBuffer:1024*1024});
   const source=await readFile(file);expect(source.toString('ascii',4,8)).toBe('ftyp');
   await page.getByLabel('Add photos',{exact:true}).setInputFiles({name:'synthetic.heic',mimeType:'image/heic',buffer:source});
   await expect(page.getByRole('status').first()).toContainText(/HEIF_DECODER_UNAVAILABLE_OR_INVALID|Upload processed/,{timeout:90000});
   const card=page.getByRole('article').first();
   if((await card.textContent())!.includes('FAILED')){await expect(card.getByRole('button',{name:'Publish media'})).toHaveCount(0);console.log('HEIC compatibility: BLOCKED by server decoder; private failure verified.');}
   else {const img=card.locator('img');await img.evaluate((element:HTMLImageElement)=>element.decode());const src=await img.getAttribute('src');const response=await page.context().request.get(src!);const info=await sharp(await response.body()).metadata();expect(info.format).toBe('webp');expect(info.exif).toBeUndefined();console.log('HEIC compatibility: actual synthetic conversion and browser WebP decode passed.');}
  } finally {await rm(folder,{recursive:true,force:true});}
 });
 test('interrupted upload retries the same reserved record and cancellation cannot publish',async({page})=>{
  test.setTimeout(90000);await login(page);const png=await sharp({create:{width:24,height:24,channels:3,background:'yellow'}}).png().toBuffer();
  const payload={name:'synthetic-retry.png',mimeType:'image/png',buffer:png};
  await page.route('**/storage/v1/upload/resumable**',route=>route.abort());
  await page.getByLabel('Add photos',{exact:true}).setInputFiles(payload);await expect(page.getByRole('status').first()).toContainText('Upload interrupted',{timeout:30000});
  await page.unroute('**/storage/v1/upload/resumable**');await page.getByLabel('Add photos',{exact:true}).setInputFiles(payload);
  await expect(page.getByText('Upload processed. Review the private preview before publication.')).toBeVisible({timeout:60000});
  await expect(page.getByRole('heading',{name:'synthetic-retry.png',exact:true})).toHaveCount(1);
  await page.route('**/storage/v1/upload/resumable**',async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.abort();});
  await page.getByLabel('Add photos',{exact:true}).setInputFiles({name:'synthetic-cancel.png',mimeType:'image/png',buffer:await sharp(png).resize(25,25).png().toBuffer()});
  await expect(page.getByRole('button',{name:'Cancel upload'})).toBeVisible();await page.getByRole('button',{name:'Cancel upload'}).click();
  await expect(page.getByRole('status').first()).toContainText(/cancelled|private/,{timeout:15000});
  await expect(page.getByRole('article').filter({has:page.getByRole('heading',{name:'synthetic-cancel.png',exact:true})}).getByRole('button',{name:'Publish media'})).toHaveCount(0);
 });
 test('real unsupported video codec is rejected and remains private',async({page})=>{
  test.setTimeout(90000);await login(page);const folder=await mkdtemp(path.join(tmpdir(),'ten29-vp9-'));const file=path.join(folder,'unsupported.mp4');
  try {
   await promisify(execFile)(ffmpeg,['-nostdin','-v','error','-f','lavfi','-i','color=c=red:s=64x64:d=1','-c:v','libvpx-vp9','-threads','1',file],{timeout:30000,maxBuffer:1024*1024});
   await page.getByLabel('Add video',{exact:true}).setInputFiles({name:'unsupported.mp4',mimeType:'video/mp4',buffer:await readFile(file)});
   await expect(page.getByRole('status').first()).toContainText('UNSUPPORTED_VIDEO',{timeout:60000});await expect(page.getByRole('article').first()).toContainText('FAILED');
   await expect(page.getByRole('article').first().getByRole('button',{name:'Publish media'})).toHaveCount(0);
  } finally {await rm(folder,{recursive:true,force:true});}
 });
 test('a corrupt H264 stream in a valid MP4 container fails decoding privately',async({page})=>{
  test.setTimeout(90000);await login(page);const folder=await mkdtemp(path.join(tmpdir(),'ten29-corrupt-'));const file=path.join(folder,'source.mp4');
  try {
   await promisify(execFile)(ffmpeg,['-nostdin','-v','error','-f','lavfi','-i','color=c=red:s=64x64:d=1','-c:v','libx264','-threads','1',file],{timeout:30000,maxBuffer:1024*1024});
   const input=await readFile(file);const mdat=input.indexOf(Buffer.from('mdat'));expect(mdat).toBeGreaterThan(4);const size=input.readUInt32BE(mdat-4);input.fill(0,mdat+4,mdat-4+size);
   await page.getByLabel('Add video',{exact:true}).setInputFiles({name:'corrupt-stream.mp4',mimeType:'video/mp4',buffer:input});
   await expect(page.getByRole('status').first()).toContainText('VIDEO_PROCESSING_FAILED',{timeout:60000});await expect(page.getByRole('article').first()).toContainText('FAILED');
   await expect(page.getByRole('article').first().getByRole('button',{name:'Publish media'})).toHaveCount(0);
  } finally {await rm(folder,{recursive:true,force:true});}
 });
 test('concurrent authorized cover changes leave exactly one primary photo',async()=>{
  const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);await owner.auth.signInWithPassword({email:process.env.TEN29_E2E_OWNER_EMAIL!,password:process.env.TEN29_E2E_OWNER_PASSWORD!});
  const rows=await owner.from('property_media').select('*').eq('kind','PHOTO');expect(rows.error).toBeNull();
  let a=rows.data!.find(m=>m.title==='Synthetic photo')!;const b=rows.data!.find(m=>m.title==='Synthetic replacement')!;
  const republished=await owner.rpc('owner_media_action',{p_action:'PUBLISH',p_id:a.id,p_version:a.version,p_data:{}});expect(republished.error).toBeNull();a=republished.data;
  const results=await Promise.all([a,b].map(m=>owner.rpc('owner_media_action',{p_action:'COVER',p_id:m.id,p_version:m.version,p_data:{}})));expect(results.every(r=>!r.error)).toBe(true);
  const covers=await owner.from('property_media').select('*').eq('featured',true);expect(covers.error).toBeNull();expect(covers.data).toHaveLength(1);
  const stale=await owner.rpc('owner_media_action',{p_action:'COVER',p_id:a.id,p_version:a.version,p_data:{}});expect(stale.error).not.toBeNull();
 });
});
