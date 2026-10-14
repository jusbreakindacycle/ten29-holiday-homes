import {z} from 'zod';
import {policyOperationSchema} from '@/types/owner-policy';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {isBookingSameOrigin} from '@/lib/booking-origin';
import {operationSchema} from '@/types/operations';
import {calendarDate,prepareQuoteSchema} from '@/types/pricing';
import {prepareItemizedQuote,issueItemizedQuote,readQuoteBreakdown,readPublicPrices} from '@/services/pricing-service';
import {deliverBookingNotifications} from '@/services/guest-booking-service';
import {operationalLog} from '@/lib/operational-log';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
async function clientForAdmin(){const c=await createSupabaseServerClient();const a=await c.auth.getUser();const m=await c.rpc('is_ten29_admin');if(a.error||!a.data.user||m.error||m.data!==true)throw Error('TEN29 access required');return c;}
export async function GET(request:Request){try{
 const c=await clientForAdmin();const u=new URL(request.url);
 const p=z.object({from:calendarDate,to:calendarDate,id:z.uuid().nullable()}).parse({from:u.searchParams.get('from'),to:u.searchParams.get('to'),id:u.searchParams.get('id')});
 const {data,error}=await c.rpc('read_booking_operations',{p_from:p.from,p_to:p.to,p_request:p.id});
 if(error||!data)throw Error('Cannot load operations');return Response.json(data,{headers});
 }catch{return Response.json({error:'TEN29 access required or operations unavailable. Retry.'},{status:403,headers});}}
export async function POST(request:Request){
 if(!isBookingSameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Invalid origin'},{status:403,headers});
 try{const c=await clientForAdmin();const reader=request.body?.getReader();if(!reader)throw Error('Missing input');const chunks:Uint8Array[]=[];let size=0;
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32768){await reader.cancel();throw Error('Input too large');}chunks.push(r.value);}
 const raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));let data:unknown;
 if(raw.action==='POLICY'){
  const p=policyOperationSchema.parse(raw);const owner=await c.rpc('is_ten29_owner');if(owner.error||owner.data!==true)throw Error('OWNER required');
  const r=await c.rpc('perform_booking_policy_operation',{p_id:p.id,p_key:p.key,p_data:p.data});if(r.error)throw Error('Policy operation rejected');data=r.data;
 }else if(['MANUAL','STATUS','PAYMENT','CANCEL','COMPLETE','NOTE'].includes(raw.action)){
  const p=operationSchema.parse(raw);const r=await c.rpc('perform_booking_operation',{p_action:p.action,p_id:p.id,p_key:p.key,p_data:p.data});if(r.error)throw Error('Operation rejected');data=r.data;
 }else if(raw.action==='QUOTE_DRAFT'){
  const p=z.object({action:z.literal('QUOTE_DRAFT'),data:prepareQuoteSchema,approved:z.literal(true)}).strict().parse(raw);data=await prepareItemizedQuote(c,p.data);
 }else if(raw.action==='QUOTE_ISSUE'||raw.action==='QUOTE_PREVIEW'){
  const p=z.object({action:z.enum(['QUOTE_ISSUE','QUOTE_PREVIEW']),id:z.uuid()}).strict().parse(raw);
  data=p.action==='QUOTE_ISSUE'?await issueItemizedQuote(c,p.id):await readQuoteBreakdown(c,p.id);
 }else if(raw.action==='ESTIMATE'){
  const p=z.object({action:z.literal('ESTIMATE'),id:z.uuid()}).strict().parse(raw);
  const r=await c.from('booking_requests').select('*').eq('id',p.id).single();if(r.error||!r.data)throw Error('Request unavailable');const b=r.data;
  data=await readPublicPrices(c,{package_code:b.package_code,check_in_date:b.check_in_date,check_out_date:b.check_out_date,overnight_guest_count:b.countable_guest_count??b.overnight_guest_count!,folding_foams_requested:b.folding_foams_requested});
 }else if(raw.action==='VERIFY'){
  const p=z.object({action:z.literal('VERIFY'),id:z.uuid(),key:z.uuid(),decision:z.enum(['VERIFIED','REJECTED']),independent:z.boolean()}).strict().parse(raw);
  const owner=await c.rpc('is_ten29_owner');if(owner.data!==true)throw Error('OWNER required');
  const r=await c.rpc('decide_booking_deposit',{p_deposit_id:p.id,p_decision:p.decision,p_independently_verified:p.independent,p_idempotency_key:p.key});if(r.error)throw Error('Verification rejected');data=r.data;
 }else if(raw.action==='CONFIRM'){
  const p=z.object({action:z.literal('CONFIRM'),id:z.uuid(),quote:z.uuid(),key:z.uuid()}).strict().parse(raw);
  const owner=await c.rpc('is_ten29_owner');if(owner.data!==true)throw Error('OWNER required');
  const r=await c.rpc('confirm_booking_reservation',{p_request_id:p.id,p_quote_id:p.quote,p_idempotency_key:p.key});if(r.error)throw Error('Confirmation rejected');data=r.data;
 }else if(raw.action==='BLOCK'){
  const p=z.object({action:z.literal('BLOCK'),from:calendarDate,to:calendarDate,key:z.uuid()}).strict().parse(raw);const owner=await c.rpc('is_ten29_owner');if(owner.data!==true)throw Error('OWNER required');
  const r=await c.rpc('create_booking_owner_block',{p_check_in:p.from,p_check_out:p.to,p_idempotency_key:p.key});if(r.error)throw Error('Block rejected');data=r.data;
 }else if(raw.action==='RELEASE'){
  const p=z.object({action:z.literal('RELEASE'),id:z.uuid()}).strict().parse(raw);const owner=await c.rpc('is_ten29_owner');if(owner.data!==true)throw Error('OWNER required');
  const r=await c.rpc('release_booking_owner_block',{p_block_id:p.id});if(r.error)throw Error('Release rejected');data=true;
 }else if(raw.action==='RETRY'){
  const p=z.object({action:z.literal('RETRY'),id:z.uuid(),key:z.uuid()}).strict().parse(raw);const r=await c.from('booking_requests').select('id').eq('id',p.id).maybeSingle();if(!r.data||r.error)throw Error('Request unavailable');const audit=await c.rpc('perform_booking_operation',{p_action:'NOTIFY_RETRY',p_id:p.id,p_key:p.key,p_data:{}});if(audit.error)throw Error('Retry unavailable');await deliverBookingNotifications(p.id);data=true;
 }else throw Error('Invalid action');
 return Response.json({data},{headers});
 }catch{operationalLog('booking_operation_failed');return Response.json({error:'Operation was not accepted. Check permissions, current status, payment terms and availability; reload before retrying with the same operation.'},{status:400,headers});}
}
