import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { readMediaDelivery } from '@/services/media-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
 try {
  const {id}=await context.params; z.uuid().parse(id);
  const url=new URL(request.url); const preview=url.searchParams.get('preview')==='1';
  const m=await readMediaDelivery(await createSupabaseServerClient(),id,preview);
  if(!m) return new Response(null,{status:404,headers});
  const poster=url.searchParams.get('poster')==='1'; const key=poster?m.poster:m.rendition;
  if(!key || !key.startsWith(`${id}/`) || key.includes('..')) return new Response(null,{status:404,headers});
  const range=request.headers.get('range');
  if(range && !/^bytes=\d*-\d*$/.test(range)) return new Response(null,{status:416,headers});
  const token=getSupabaseServiceRoleKey();
  const upstream=await fetch(`${getSupabaseUrl()}/storage/v1/object/authenticated/ten29-renditions/${key}`,{headers:{Authorization:`Bearer ${token}`,apikey:token,...(range?{Range:range}:{})},cache:'no-store'});
  if(!upstream.ok) return new Response(null,{status:404,headers});
  const result=new Headers(headers); result.set('Content-Type',poster||m.kind==='PHOTO'?'image/webp':'video/mp4');
  for(const h of ['content-length','content-range','accept-ranges']) { const v=upstream.headers.get(h); if(v) result.set(h,v); }
  return new Response(upstream.body,{status:upstream.status,headers:result});
 } catch { return new Response(null,{status:404,headers}); }
}
