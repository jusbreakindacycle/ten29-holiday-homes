import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isBookingSameOrigin } from '@/lib/booking-origin';
import { actionMediaSchema } from '@/lib/media-validation';
import { ownerMediaLibrary, reserveMedia, changeMedia, processOwnerMedia, cleanupArchivedMedia } from '@/services/media-service';
import { operationalLog } from '@/lib/operational-log';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=240;
const headers={'Cache-Control':'private, no-store'};
export async function GET() {
 try { return Response.json({media:await ownerMediaLibrary(await createSupabaseServerClient())},{headers}); }
 catch { return Response.json({error:'OWNER access required or library unavailable'},{status:403,headers}); }
}
export async function POST(request:Request) {
 if(!isBookingSameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({error:'Invalid origin'},{status:403,headers});
 try {
  const reader=request.body?.getReader();if(!reader)throw Error('Invalid input');
  let total=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>8192){await reader.cancel();throw Error('Invalid input');}chunks.push(value);}
  const text=Buffer.concat(chunks).toString('utf8');
  const raw=JSON.parse(text); const client=await createSupabaseServerClient();
  if(raw.action==='RESERVE') return Response.json({media:await reserveMedia(client,raw.data)},{headers});
  const p=actionMediaSchema.parse(raw);
  const media=p.action==='PROCESS'?await processOwnerMedia(client,p.id):p.action==='CLEANUP'?await cleanupArchivedMedia(client,p.id):await changeMedia(client,p.id,p.version,p.action,p.data);
  return Response.json({media},{headers});
 } catch(e) { operationalLog('media_operation_failed'); return Response.json({error:e instanceof Error && !('issues' in e)?e.message:'Invalid media input'},{status:400,headers}); }
}
