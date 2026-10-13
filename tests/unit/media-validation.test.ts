import {describe,it,expect} from 'vitest';
import sharp from 'sharp';
import {mediaSignature,validateMediaBytes,editMediaSchema,reserveMediaSchema} from '@/lib/media-validation';
import {processMediaBytes} from '@/services/media-processor';
describe('private media validation and safe processing',()=>{
 for(const format of ['jpeg','png','webp'] as const) it(`${format} decodes into metadata-free WebP`,async()=>{
  const source=await sharp({create:{width:64,height:48,channels:3,background:'#345634'}})[format]().withMetadata().toBuffer();
  expect(mediaSignature(source)).toBe(`image/${format}`);
  const result=await processMediaBytes(source,`image/${format}`,source.length);
  const metadata=await sharp(result.rendition).metadata();
  expect(metadata.format).toBe('webp');expect(metadata.exif).toBeUndefined();expect(metadata.icc).toBeUndefined();expect(metadata.width).toBe(64);expect(result.poster).not.toBeNull();
 });
 it('rejects SVG HTML and executable signatures',()=>{
  for(const value of ['<svg onload="alert(1)"></svg>','<html>secret</html>','MZ executable file']) expect(mediaSignature(Buffer.from(value))).toBeNull();
 });
 it('rejects MIME spoofing and byte count mismatch',async()=>{
  const source=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  expect(()=>validateMediaBytes(source,'image/jpeg',source.length)).toThrow('TYPE_MISMATCH');
  expect(()=>validateMediaBytes(source,'image/png',1)).toThrow('SIZE_MISMATCH');
 });
 it('corrupt image with valid signature fails real decoding',async()=>{
  const source=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0,73,69,78,68,0,0,0,0]);
  await expect(processMediaBytes(source,'image/png',source.length)).rejects.toThrow('INVALID_IMAGE');
 });
 it('rejects a photo with a polyglot trailer before decoding',async()=>{
  const source=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  const input=Buffer.concat([source,Buffer.from('<script>private malicious trailer</script>')]);
  await expect(processMediaBytes(input,'image/png',input.length)).rejects.toThrow('POLYGLOT_TRAILER');
 });
 it('rejects oversized photos and unapproved SVG mime',()=>{
  expect(reserveMediaSchema.safeParse({key:crypto.randomUUID(),mime:'image/png',bytes:20971521}).success).toBe(false);
  expect(reserveMediaSchema.safeParse({key:crypto.randomUUID(),mime:'image/svg+xml',bytes:20}).success).toBe(false);
 });
 it('strict metadata rejects forged publication fields and invalid sort/category',()=>{
  const input={title:'A',caption:'',alt:'Photo',category:'Room 1',position:1,rights:true};
  expect(editMediaSchema.safeParse({...input,state:'PUBLISHED'}).success).toBe(false);
  expect(editMediaSchema.safeParse({...input,position:-1}).success).toBe(false);
  expect(editMediaSchema.safeParse({...input,category:'Free pool access'}).success).toBe(false);
 });
});
