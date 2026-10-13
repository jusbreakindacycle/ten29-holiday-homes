import 'server-only';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validateMediaBytes } from '@/lib/media-validation';
const run = promisify(execFile);
sharp.cache(false); sharp.concurrency(1);
export interface ProcessedMedia { rendition: Buffer; poster: Buffer | null; info: Record<string, unknown>; mime: 'image/webp' | 'video/mp4' }
export async function processMediaBytes(bytes: Buffer,mime:string,expectedBytes:number):Promise<ProcessedMedia> {
 validateMediaBytes(bytes,mime,expectedBytes);
 if(mime.startsWith('image/')) {
  let decoded=bytes;
  let directory:string|null=null;
  try {
   if(mime==='image/heic'||mime==='image/heif') {
    directory=await mkdtemp(path.join(tmpdir(),'ten29-heif-'));const original=path.join(directory,'source.heic');const png=path.join(directory,'decoded.png');
    await writeFile(original,bytes,{flag:'wx'});
    await run(process.env.TEN29_IMAGEMAGICK_PATH || (process.platform==='win32'?'magick':'convert'),['-limit','memory','128MiB','-limit','map','128MiB','-limit','disk','0','-limit','area','40MP','-limit','thread','1',original,'-auto-orient','-strip',png],{timeout:30000,maxBuffer:1024*1024,windowsHide:true});
    decoded=await readFile(png);if(decoded.length>160000000) throw Error('INVALID_IMAGE');
   }
   const image=sharp(decoded,{limitInputPixels:40000000,failOn:'warning',animated:false});
   const metadata=await image.metadata();
   if(!metadata.width || !metadata.height || (metadata.pages??1)>1) throw Error('INVALID_IMAGE');
   const rendition=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).timeout({seconds:30}).toBuffer();
   const output=await sharp(rendition).metadata();
   const poster=await sharp(rendition).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:75}).timeout({seconds:30}).toBuffer();
   return {rendition,poster,mime:'image/webp',info:{width:output.width,height:output.height,format:'webp',metadata_stripped:true}};
  } catch { throw Error(mime==='image/heic'||mime==='image/heif'?'HEIF_DECODER_UNAVAILABLE_OR_INVALID':'INVALID_IMAGE'); }
  finally {if(directory)await rm(directory,{recursive:true,force:true});}
 }
 const ffmpeg=process.env.TEN29_FFMPEG_PATH || 'ffmpeg';
 const folder=await mkdtemp(path.join(tmpdir(),'ten29-media-'));
 try {
  const original=path.join(folder,'source'); const output=path.join(folder,'output.mp4'); const posterPath=path.join(folder,'poster.webp');
  await writeFile(original,bytes,{flag:'wx'});
  const probe=await run(process.env.TEN29_FFPROBE_PATH || 'ffprobe',['-v','error','-protocol_whitelist','file,pipe','-enable_drefs','0','-show_streams','-show_format','-of','json',original],{timeout:15000,maxBuffer:1024*1024,windowsHide:true});
  const info=JSON.parse(probe.stdout) as { streams: Array<{codec_type:string;codec_name:string;width?:number;height?:number}>;format:{duration?:string} };
  const video=info.streams.find(s=>s.codec_type==='video'); const duration=Number(info.format.duration);
  if(!video || !['h264','hevc'].includes(video.codec_name) || !video.width || !video.height || video.width*video.height>12000000 || !Number.isFinite(duration) || duration<=0 || duration>120) throw Error('UNSUPPORTED_VIDEO');
  if(info.streams.some(s=>s.codec_type==='audio'&&!['aac','pcm_s16le','pcm_s24le'].includes(s.codec_name))) throw Error('UNSUPPORTED_AUDIO');
  await run(ffmpeg,['-nostdin','-v','error','-xerror','-threads','1','-protocol_whitelist','file,pipe','-enable_drefs','0','-i',original,'-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-map_chapters','-1','-vf',"scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-threads','1','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',output],{timeout:150000,maxBuffer:1024*1024,windowsHide:true});
  await run(ffmpeg,['-nostdin','-v','error','-threads','1','-i',output,'-frames:v','1','-vf','scale=480:-2',posterPath],{timeout:15000,maxBuffer:1024*1024,windowsHide:true});
  const rendition=await readFile(output); if(rendition.length>50*1024*1024) throw Error('OUTPUT_TOO_LARGE');
  return {rendition,poster:await readFile(posterPath),mime:'video/mp4',info:{duration_seconds:duration,source_codec:video.codec_name,codec:'h264',audio:'aac',metadata_stripped:true}};
 } catch(e) { if(e instanceof Error && ['UNSUPPORTED_VIDEO','UNSUPPORTED_AUDIO','OUTPUT_TOO_LARGE'].includes(e.message)) throw e; throw Error('VIDEO_PROCESSING_FAILED'); }
 finally { await rm(folder,{recursive:true,force:true}); }
}
