'use client';
import {useState} from 'react';
import type {OpsData,OpsRequest} from '@/types/operations';
import {PACKAGE_POLICY} from '@/types/owner-policy';
import {formatPhp,phpToCentavos} from '@/types/pricing';
const input='mt-1 min-h-11 w-full rounded-sm border border-border bg-white px-3 py-2';
const button='min-h-11 rounded-sm border border-forest px-4 py-2 text-forest disabled:opacity-50';
type Act=(p:Record<string,unknown>)=>Promise<unknown>;
export function OwnerPolicyOperations({request:r,data,act,busy}:{request:OpsRequest;data:OpsData;act:Act;busy:boolean}){
 const [status,setStatus]=useState('SENT_EXTERNALLY');
 const stay=data.reservations.find(s=>s.request_id===r.id);
 const events=(data.policy_events??[]).filter(e=>e.request_id===r.id);
 const approve=events.filter(e=>e.type==='EXTRA_APPROVE').at(-1);
 const security=events.filter(e=>e.type==='SECURITY_RECORD');
 const collected=security.filter(e=>events.some(v=>v.type==='SECURITY_VERIFY'&&v.data.event_id===e.id)).reduce((n,e)=>n+Number(e.data.amount_centavos),0);
 const recorded=security.reduce((n,e)=>n+Number(e.data.amount_centavos),0);
 const refunded=events.filter(e=>e.type==='SECURITY_REFUND_SENT').reduce((n,e)=>n+Number(e.data.amount_centavos),0);
 const authorized=events.find(e=>e.type==='SECURITY_REFUND_AUTHORIZE');
 const deducted=Number(authorized?.data.deduction_centavos??0);
 const rules=events.filter(e=>e.type==='RULES').at(-1)?.data.status??'NOT_SENT';
 const policy=(type:string,fields:Record<string,unknown>,id=stay?.id??r.id)=>act({action:'POLICY',id,data:{type,...fields}});
 function money(f:FormData,name:string){return phpToCentavos(String(f.get(name)||'0'));}
 function submit(e:React.FormEvent<HTMLFormElement>,type:string,build:(f:FormData)=>Record<string,unknown>){e.preventDefault();try{void policy(type,build(new FormData(e.currentTarget)));}catch{alert('Review exact PHP amounts.');}}
 return <section aria-label="Owner booking policy" className="space-y-4 rounded-sm border border-forest bg-white p-4">
 <h2 className="font-heading text-xl">Owner booking policy</h2>
 {r.policy_version==='LEGACY'||!r.policy_version?<p>Legacy counting and quotation terms retained; age bands are not inferred.</p>:<>
 <p>Policy {r.policy_version} · Included {PACKAGE_POLICY[r.package_code].included} · Countable {r.countable_guest_count} · Free young children {r.exempt_children_count} · Actual occupants {r.overnight_guest_count}</p>
 <p>Extra requested: {r.extra_guests_requested} · OWNER approved: {String(approve?.data.count??'Pending')} · PHP 400 per approved extra guest per night.</p>
 {r.occupancy_owner_review&&<p>Large actual occupancy: review legal and physical safety requirements directly. The software input bound is not accommodation policy.</p>}
 {data.owner&&!stay&&<button className={button} disabled={busy} onClick={()=>confirm('Approve the exact extra guest count and independently review the actual overnight occupancy? This authorizes the PHP 400 nightly extra-guest line only in a new private quotation.')&&void policy('EXTRA_APPROVE',{count:r.extra_guests_requested,occupancy_reviewed:true},r.id)}>Approve extra guests and occupancy</button>}
 </>}
 {stay&&<>
 <h3 className="font-heading text-lg">Separate refundable security deposit</h3>
 <p>Obligation: {r.policy_version==='LEGACY'?'See historical quote; not inferred':formatPhp(PACKAGE_POLICY[r.package_code].securityCentavos)}. Collection time is OWNER managed.</p>
 <p>Recorded: {formatPhp(recorded)} · Independently verified: {formatPhp(collected)} · Authorized deduction: {formatPhp(deducted)} · Actually refunded: {formatPhp(refunded)} · Outstanding liability: {formatPhp(collected-deducted-refunded)}</p>
 <p>Inspection: {String(events.filter(e=>e.type==='INSPECTION').at(-1)?.data.status??'PENDING')}. Refund authorized: {authorized?formatPhp(Number(authorized.data.refund_centavos)):'Pending'}. Refund target: 24–48 hours after checkout, subject to inspection and approved deductions.</p>
 {stay.check_out_date&&r.policy_version!=='LEGACY'&&<p>Asia/Manila reminder: {stay.check_out_date} before noon checkout; target {new Date(Date.parse(stay.check_out_date+'T12:00:00+08:00')+86400000).toISOString()} to {new Date(Date.parse(stay.check_out_date+'T12:00:00+08:00')+2*86400000).toISOString()} (UTC). Actual checkout may be earlier.</p>}
 {data.owner&&<>
 <form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>submit(e,'SECURITY_RECORD',f=>({amount_centavos:money(f,'amount'),method:f.get('method')}))}><label>Security collection recorded (PHP)<input required className={input} name="amount"/></label><label>Security payment method<select className={input} name="method"><option>BANK_TRANSFER</option><option>GCASH</option></select></label><button className={button} disabled={busy}>Record unverified security receipt</button></form>
 {security.map(e=><p key={e.id}>{formatPhp(Number(e.data.amount_centavos))} · {String(e.data.method)} · {e.created_at} · {events.some(v=>v.type==='SECURITY_VERIFY'&&v.data.event_id===e.id)?'VERIFIED':<button className={button} disabled={busy} onClick={()=>confirm('Independently verified actual security-deposit funds? This cannot satisfy accommodation payment.')&&void policy('SECURITY_VERIFY',{event_id:e.id,independent:true})}>Verify security receipt</button>}</p>)}
 <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>void policy('INSPECTION',{status:'PASSED'})}>Record inspection passed</button><button className={button} disabled={busy} onClick={()=>void policy('INSPECTION',{status:'DEDUCTIONS_REVIEW'})}>Record inspection needs deduction review</button></div>
 {!authorized&&<form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>submit(e,'SECURITY_REFUND_AUTHORIZE',f=>({deduction_centavos:money(f,'deduction'),refund_centavos:money(f,'refund'),reason:f.get('reason')}))}><label>OWNER deduction (PHP)<input required className={input} name="deduction" defaultValue="0"/></label><label>OWNER authorized security refund (PHP)<input required className={input} name="refund"/></label><label>Deduction reason<select className={input} name="reason"><option>OWNER_EXCEPTION</option><option>PROPERTY_DAMAGE</option><option>EXCESS_CLEANING</option></select></label><p>Inspection and exact allocation of verified collection required. No deduction is automatic.</p><button className={button} disabled={busy}>Authorize security refund and deductions</button></form>}
 {authorized&&<form onSubmit={e=>submit(e,'SECURITY_REFUND_SENT',f=>({amount_centavos:money(f,'amount'),independent:true}))}><label>Actual security refund sent and independently checked (PHP)<input required className={input} name="amount"/></label><button className={button} disabled={busy}>Record actual security refund</button></form>}
 <h3 className="font-heading text-lg">External House Rules delivery: {String(rules)}</h3><p>Contents, copies, uploads, links and conversation evidence must never be entered here. Status does not assert agreement to undisclosed terms.</p>
 {stay.operational_status==='CONFIRMED'&&<><label>External delivery status<select className={input} value={status} onChange={e=>setStatus(e.target.value)}>{['NOT_SENT','SENT_EXTERNALLY','ACKNOWLEDGED_BY_GUEST','NEEDS_FOLLOW_UP'].map(s=><option key={s}>{s}</option>)}</select></label><button disabled={busy} className={button} onClick={()=>confirm('Record this actual externally evidenced status? Acknowledgement requires genuine guest evidence; do not paste evidence or rules into TEN29.')&&void policy('RULES',{status,genuinely_evidenced:true})}>Record external delivery status</button></>}
 <h3 className="font-heading text-lg">Rescheduling review</h3><p>One request, subject to availability and OWNER approval. Date replacement is blocked. Late credit needs an explicit financial decision; no 60-day start or 30% fee base is assumed.</p>
 {!events.some(e=>e.type==='RESCHEDULE_REQUEST')&&stay.operational_status==='CONFIRMED'&&<form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>submit(e,'RESCHEDULE_REQUEST',f=>({check_in_date:f.get('from'),check_out_date:f.get('to')}))}><label>Requested replacement arrival<input required type="date" className={input} name="from"/></label><label>Requested replacement checkout<input required type="date" className={input} name="to"/></label><button className={button} disabled={busy}>Record rescheduling request for review</button></form>}
 {events.filter(e=>e.type.startsWith('RESCHEDULE')).map(e=><p key={e.id}>{e.type} · {e.created_at} · {String(e.data.check_in_date??e.data.decision)} {String(e.data.check_out_date??'')}</p>)}
 {events.some(e=>e.type==='RESCHEDULE_REQUEST')&&<div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>void policy('RESCHEDULE_REVIEW',{decision:'DECLINED'})}>Decline rescheduling</button><button className={button} disabled={busy} onClick={()=>void policy('RESCHEDULE_REVIEW',{decision:'REQUIRES_OWNER_FINANCIAL_DECISION'})}>Flag owner financial decision</button></div>}
 {stay.operational_status==='CANCELLED'&&<>
 <h3 className="font-heading text-lg">Cancellation settlement review</h3><p>Cancellation recorded {data.events.find(e=>e.action==='CANCEL'&&e.reservation_id===stay.id)?.created_at}. Check-in {stay.check_in_date}. Allocate verified payments only. Normal policy states 50% reservation-fee refund; same-day/no-show states forfeiture. Balance disposition requires an explicit OWNER decision.</p>
 {!events.some(e=>e.type==='CANCELLATION_REVIEW')&&<form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>submit(e,'CANCELLATION_REVIEW',f=>({classification:f.get('classification'),refund_centavos:money(f,'refund'),forfeit_centavos:money(f,'forfeit'),credit_centavos:money(f,'credit'),credit_start:f.get('credit_start')||null,credit_end:f.get('credit_end')||null,processing_centavos:money(f,'processing'),basis:f.get('basis'),final:true}))}>
 <label>Owner policy classification<select className={input} name="classification">{['NORMAL','SAME_DAY','NO_SHOW','OWNER_EXCEPTION'].map(s=><option key={s}>{s}</option>)}</select></label><label>Approved calculation basis<select className={input} name="basis"><option>VERIFIED_ACCOMMODATION</option><option>OWNER_EXCEPTION</option></select></label>
 {['refund','forfeit','credit','processing'].map(s=><label key={s}>OWNER final {s} (PHP)<input required className={input} name={s} defaultValue="0"/></label>)}<label>Credit start (only if approved)<input className={input} name="credit_start" type="date"/></label><label>Credit end (only if approved)<input className={input} name="credit_end" type="date"/></label><button className={button} disabled={busy}>Record final owner financial decision</button></form>}
 {events.filter(e=>e.type==='CANCELLATION_REVIEW').map(e=><p key={e.id}>Final OWNER decision {String(e.data.classification)} · Refund {formatPhp(Number(e.data.refund_centavos))} · Forfeit {formatPhp(Number(e.data.forfeit_centavos))} · Credit {formatPhp(Number(e.data.credit_centavos))} · Processing {formatPhp(Number(e.data.processing_centavos))}</p>)}
 <form onSubmit={e=>submit(e,'ACCOMMODATION_REFUND_SENT',f=>({amount_centavos:money(f,'amount'),independent:true}))}><label>Actual accommodation refund sent and independently checked (PHP)<input required className={input} name="amount"/></label><button className={button} disabled={busy}>Record actual accommodation refund</button></form><p>Actually settled: {formatPhp(events.filter(e=>e.type==='ACCOMMODATION_REFUND_SENT').reduce((n,e)=>n+Number(e.data.amount_centavos),0))}. Authorized refund is not settlement.</p>
 </>}
 </>}
 </>}
 <h3>Policy audit events</h3>{events.map(e=><p className="break-all text-sm" key={e.id}>{e.type} · {e.created_at} · OWNER {e.actor_id}</p>)}
 </section>;
}
