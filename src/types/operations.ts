import { z } from 'zod';
import { createBookingRequestSchema, BOOKING_REQUEST_STATUSES, type BookingRequest, type BookingQuote, type BookingReservation, type BookingDeposit } from './booking';
import { calendarDate, centavos, type PublicPriceEstimate } from './pricing';
export const manualRequestSchema = z.object({
 source:z.enum(['MESSENGER','PHONE','WALK_IN','EXTERNAL_PLATFORM','OTHER']),
 package_code:z.enum(['WHOLE_HOME_1BR','WHOLE_HOME_2BR','WHOLE_HOME_3BR']),
 check_in_date:calendarDate,check_out_date:calendarDate,overnight_guest_count:z.number().int().min(1).max(8),folding_foams_requested:z.boolean(),
 full_name:z.string().trim().min(1).max(120),contact_number:z.string().trim().min(5).max(40),
 email:z.union([z.email().max(254),z.literal('')]),notes:z.string().max(2000),
}).strict().superRefine((p,c)=>{const {full_name,contact_number,email,notes,...selection}=p;void full_name;void contact_number;void email;void notes;
 if(!createBookingRequestSchema.safeParse(selection).success)c.addIssue({code:'custom',message:'Review package capacity and stay dates.'});
 if(p.check_out_date>p.check_in_date && (Date.parse(p.check_out_date)-Date.parse(p.check_in_date))/86400000>366)c.addIssue({code:'custom',message:'Stay exceeds 366 nights.'});
});
const lifecycle=z.object({reason:z.string().trim().min(1).max(500),refund_review_acknowledged:z.boolean()}).strict();
export const operationSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('NOTE'),id:z.uuid(),key:z.uuid(),data:z.object({text:z.string().trim().min(1).max(500)}).strict()}).strict(),
 z.object({action:z.literal('MANUAL'),id:z.null(),key:z.uuid(),data:manualRequestSchema}).strict(),
 z.object({action:z.literal('STATUS'),id:z.uuid(),key:z.uuid(),data:z.object({status:z.enum(BOOKING_REQUEST_STATUSES),expected_status:z.enum(BOOKING_REQUEST_STATUSES)}).strict()}).strict(),
 z.object({action:z.literal('PAYMENT'),id:z.uuid(),key:z.uuid(),data:z.object({amount_centavos:centavos.refine(n=>n>0),payment_method:z.string().max(40),masked_reference:z.string().max(80).refine(s=>!/[0-9]{5,}/.test(s))}).strict()}).strict(),
 z.object({action:z.literal('CANCEL'),id:z.uuid(),key:z.uuid(),data:lifecycle.refine(d=>d.refund_review_acknowledged)}).strict(),
 z.object({action:z.literal('COMPLETE'),id:z.uuid(),key:z.uuid(),data:lifecycle}).strict(),
]);
export type OpsRequest=BookingRequest & {reference:string;full_name:string|null;contact_number:string|null;email:string|null;notes:string|null};
export type OpsData={owner:boolean;requests:OpsRequest[];quotes:BookingQuote[];
 deposits:(BookingDeposit&{decision:'VERIFIED'|'REJECTED'|null;decided_by:string|null;decided_at:string|null})[];
 reservations:(BookingReservation&{operational_status:'CONFIRMED'|'CANCELLED'|'COMPLETED'})[];
 occupancies:{id:string;check_in_date:string;check_out_date:string;kind:string;active:boolean;reservation_id:string|null}[];
 events:{id:string;action:string;reason:string;actor_id:string;created_at:string;refund_review_required:boolean}[];
 request_events:{id:string;new_status:string;actor_id:string|null;created_at:string}[];
 reservation_events:{id:string;new_status:string;actor_id:string;created_at:string}[];
 block_events:{id:string;event:string;actor_id:string;created_at:string}[];
 notifications:{request_id:string;recipient_kind:string;status:string;attempts:number;first_attempt_at:string|null}[];
 estimates:{request_id:string;estimate:PublicPriceEstimate}[];
};
