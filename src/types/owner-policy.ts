import { z } from 'zod';
import type { BookingPackageCode } from './booking';

export const OWNER_POLICY_VERSION = 'TEN29-20261015-v1' as const;
// Abuse bound only; this is not an approved physical accommodation capacity.
export const OCCUPANT_INPUT_BOUND = 32;
export const PACKAGE_POLICY = {
  WHOLE_HOME_1BR: { included: 2, maximum: 3, securityCentavos: 150000 },
  WHOLE_HOME_2BR: { included: 4, maximum: 5, securityCentavos: 180000 },
  WHOLE_HOME_3BR: { included: 6, maximum: 8, securityCentavos: 200000 },
} as const;
export function occupancy(adults: number, olderChildren: number, youngChildren: number, code: BookingPackageCode) {
  const countable = adults + olderChildren;
  const actual = countable + youngChildren;
  const policy = PACKAGE_POLICY[code];
  return { countable, actual, exempt: youngChildren, included: policy.included,
    extraRequested: Math.max(0, countable - policy.included), ownerReview: actual > 8,
    eligible: Number.isInteger(actual) && adults >= 1 && olderChildren >= 0 && youngChildren >= 0 && countable <= policy.maximum && actual <= OCCUPANT_INPUT_BOUND };
}
export function paymentProposal(total: number, checkIn: string, today: string) {
  if (!Number.isSafeInteger(total) || total < 0) throw Error('Invalid centavo amount');
  const notice = (Date.parse(checkIn) - Date.parse(today)) / 86400000;
  const down = notice <= 7 ? total : Math.floor((total * 30 + 50) / 100);
  return { down, balance: total - down, boundaryReview: notice === 7,
    balanceDue: new Date(Date.parse(checkIn) - 7 * 86400000).toISOString().slice(0, 10),
    basis: 'PROPOSED_FINAL_ACCOMMODATION_EXCLUDING_SECURITY' as const };
}
const money = z.number().int().min(0).max(999999999999);
const reason = z.enum(['PROPERTY_DAMAGE','EXCESS_CLEANING','OWNER_EXCEPTION']);
export const policyOperationSchema = z.object({ action: z.literal('POLICY'), id: z.uuid(), key: z.uuid(), data: z.discriminatedUnion('type', [
  z.object({type:z.literal('EXTRA_APPROVE'),count:z.number().int().min(0).max(2),occupancy_reviewed:z.literal(true)}).strict(),
  z.object({type:z.literal('QUOTE_AUTHORIZE'),basis_approved:z.literal(true),terms_communicated:z.literal(true),boundary_reviewed:z.literal(true)}).strict(),
  z.object({type:z.literal('SECURITY_RECORD'),amount_centavos:money.refine(n=>n>0),method:z.enum(['BANK_TRANSFER','GCASH'])}).strict(),
  z.object({type:z.literal('SECURITY_VERIFY'),event_id:z.uuid(),independent:z.literal(true)}).strict(),
  z.object({type:z.literal('INSPECTION'),status:z.enum(['PASSED','DEDUCTIONS_REVIEW'])}).strict(),
  z.object({type:z.literal('SECURITY_REFUND_AUTHORIZE'),deduction_centavos:money,reason,refund_centavos:money}).strict(),
  z.object({type:z.literal('SECURITY_REFUND_SENT'),amount_centavos:money.refine(n=>n>0),independent:z.literal(true)}).strict(),
  z.object({type:z.literal('RULES'),status:z.enum(['NOT_SENT','SENT_EXTERNALLY','ACKNOWLEDGED_BY_GUEST','NEEDS_FOLLOW_UP']),genuinely_evidenced:z.literal(true)}).strict(),
  z.object({type:z.literal('RESCHEDULE_REQUEST'),check_in_date:z.iso.date(),check_out_date:z.iso.date()}).strict(),
  z.object({type:z.literal('RESCHEDULE_REVIEW'),decision:z.enum(['DECLINED','REQUIRES_OWNER_FINANCIAL_DECISION'])}).strict(),
  z.object({type:z.literal('CANCELLATION_REVIEW'),classification:z.enum(['NORMAL','SAME_DAY','NO_SHOW','OWNER_EXCEPTION']),refund_centavos:money,forfeit_centavos:money,credit_centavos:money,credit_start:z.iso.date().nullable(),credit_end:z.iso.date().nullable(),processing_centavos:money,basis:z.enum(['VERIFIED_ACCOMMODATION','OWNER_EXCEPTION']),final:z.literal(true)}).strict(),
  z.object({type:z.literal('ACCOMMODATION_REFUND_SENT'),amount_centavos:money.refine(n=>n>0),independent:z.literal(true)}).strict(),
]) }).strict();
export type PolicyEvent = {id:string;request_id:string;reservation_id:string|null;quote_id:string|null;type:string;data:Record<string,unknown>;actor_id:string;created_at:string};
