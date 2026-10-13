import { z } from 'zod';
export const MEDIA_CATEGORIES = ['Exterior','Entrance','Living Area','Kitchen & Dining','Room 1','Room 2','Room 3','Bathrooms','Lanai / Outdoor','Parking','Amenities','Property Tour Videos'] as const;
export const MEDIA_MIMES = ['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime'] as const;
export const reserveMediaSchema = z.object({ key: z.uuid(), mime: z.enum(MEDIA_MIMES), bytes: z.number().int().positive().max(50*1024*1024) }).strict().refine(p => !p.mime.startsWith('image/') || p.bytes<=20*1024*1024, 'Photos must be at most 20 MiB');
export const editMediaSchema = z.object({ title: z.string().trim().max(120), caption: z.string().trim().max(500), alt: z.string().trim().max(250), category: z.enum(MEDIA_CATEGORIES), position: z.number().int().min(0).max(10000), rights: z.boolean(), public_claim_id: z.string().max(80).nullable().default(null) }).strict();
export const actionMediaSchema = z.object({ action: z.enum(['EDIT','PUBLISH','UNPUBLISH','ARCHIVE','COVER','PROCESS','CLEANUP']), id: z.uuid(), version: z.number().int().positive(), data: z.record(z.string(),z.unknown()).default({}) }).strict();
/** Check bytes, not the filename; a real decoder is still mandatory after this check. */
export function mediaSignature(bytes: Uint8Array): string | null {
 const b=Buffer.from(bytes); if(b.length<12) return null;
 if(b.subarray(0,3).equals(Buffer.from([255,216,255]))) return 'image/jpeg';
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
 if(b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP') return 'image/webp';
 if(b.toString('ascii',4,8)==='ftyp') {
  const brands=b.toString('ascii',8,Math.min(b.length,64));
  if(/heic|heix|hevc|hevx|mif1/.test(brands)) return 'image/heic';
  if(brands.includes('qt  ')) return 'video/quicktime';
  if(/isom|iso2|mp41|mp42|avc1|M4V /.test(brands)) return 'video/mp4';
 }
 return null;
}
export function validateMediaBytes(bytes: Uint8Array,mime:string,expectedBytes:number) {
 if(bytes.length!==expectedBytes || bytes.length>50*1024*1024) throw Error('SIZE_MISMATCH');
 const actual=mediaSignature(bytes);
 if(!actual || !(actual===mime || (actual==='image/heic' && mime==='image/heif'))) throw Error('TYPE_MISMATCH');
 const b=Buffer.from(bytes);
 if(actual==='image/jpeg' && (b[b.length-2]!==255||b[b.length-1]!==217)) throw Error('POLYGLOT_TRAILER');
 if(actual==='image/png' && (b.length<20 || b.toString('ascii',b.length-8,b.length-4)!=='IEND')) throw Error('POLYGLOT_TRAILER');
 if(actual==='image/webp' && b.readUInt32LE(4)+8!==b.length) throw Error('POLYGLOT_TRAILER');
 if(actual==='video/mp4'||actual==='video/quicktime'||actual==='image/heic') {
  let offset=0;
  while(offset<b.length){if(offset+8>b.length)throw Error('INVALID_CONTAINER');let size=b.readUInt32BE(offset);
   if(size===1){if(offset+16>b.length)throw Error('INVALID_CONTAINER');const large=b.readBigUInt64BE(offset+8);if(large>BigInt(b.length))throw Error('INVALID_CONTAINER');size=Number(large);}
   if(size===0){offset=b.length;break;}if(size<8 || offset+size>b.length)throw Error('INVALID_CONTAINER');offset+=size;
  }
 }
 // Originals remain private; public bytes are freshly decoded/re-encoded, never copied.
 return actual;
}
