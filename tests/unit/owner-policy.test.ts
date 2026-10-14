import {describe,it,expect} from 'vitest';
import {OWNER_POLICY_VERSION,occupancy,PACKAGE_POLICY,paymentProposal,policyOperationSchema} from '@/types/owner-policy';
import {createBookingRequestSchema,recommendBookingPackage} from '@/types/booking';
import {calculateQuotation} from '@/lib/pricing';
const base={source:'PHONE' as const,check_in_date:'2030-01-01',check_out_date:'2030-01-03',policy_version:OWNER_POLICY_VERSION,folding_foams_requested:true};
describe('owner policy age bands and authoritative approvals',()=>{
 it.each([['WHOLE_HOME_1BR',3],['WHOLE_HOME_2BR',5],['WHOLE_HOME_3BR',8]] as const)('permits %s requested extras within policy maximum', (package_code,adults_count)=>{
  expect(createBookingRequestSchema.safeParse({...base,package_code,adults_count,older_children_count:0,exempt_children_count:1,overnight_guest_count:adults_count+1}).success).toBe(true);
  expect(createBookingRequestSchema.safeParse({...base,package_code,adults_count:adults_count+1,older_children_count:0,exempt_children_count:0,overnight_guest_count:adults_count+1}).success).toBe(false);
 });
 it('records actual occupants without billing exempt young children',()=>{
  expect(occupancy(7,0,1,'WHOLE_HOME_3BR')).toMatchObject({countable:7,actual:8,exempt:1,extraRequested:1,eligible:true});
  expect(occupancy(2,0,1,'WHOLE_HOME_1BR').extraRequested).toBe(0);
 });
 it('reads approved extra-guest snapshots with their full nightly multiplier',()=>{
  const nights=[{date:'2030-01-01',package_code:'WHOLE_HOME_3BR' as const,amount_centavos:10005,source:'OWNER_MANUAL',rate_revision_id:null},
   {date:'2030-01-02',package_code:'WHOLE_HOME_3BR' as const,amount_centavos:10005,source:'OWNER_MANUAL',rate_revision_id:null}];
  expect(calculateQuotation(nights,[{type:'CHARGE',description:'OWNER-approved additional guests',quantity:1,unit_amount_centavos:40000,nights:2,reason:'OWNER approval',status:'APPROVED',approved_by:'owner',approved_at:'2030-01-01',line_total_centavos:80000}]).final_total_centavos).toBe(100010);
 });
 it('flags large actual occupancy and enforces an abuse bound',()=>{
  expect(occupancy(8,0,8,'WHOLE_HOME_3BR')).toMatchObject({eligible:true,ownerReview:true,actual:16});
  expect(occupancy(8,0,25,'WHOLE_HOME_3BR').eligible).toBe(false);
 });
 it('does not hide occupants or accept guest approval flags',()=>{
  const p={...base,package_code:'WHOLE_HOME_3BR',adults_count:7,older_children_count:0,exempt_children_count:1,overnight_guest_count:7};
  expect(createBookingRequestSchema.safeParse(p).success).toBe(false);
  expect(createBookingRequestSchema.safeParse({...p,overnight_guest_count:8,extra_approved:true}).success).toBe(false);
 });
 it.each([1,2,3,4,5,6,7,8])('recommends without granting extra approval for %i',n=>{
  expect(recommendBookingPackage(n)?.packageCode).toBe(n<=2?'WHOLE_HOME_1BR':n<=4?'WHOLE_HOME_2BR':'WHOLE_HOME_3BR');
 });
 it('preserves legacy counting without reinterpreting young children',()=>{
  expect(createBookingRequestSchema.safeParse({source:'PHONE',package_code:'WHOLE_HOME_1BR',check_in_date:'2030-01-01',check_out_date:'2030-01-02',overnight_guest_count:3}).success).toBe(false);
 });
 it('rounds exact 30/70 cents and excludes separately held security funds',()=>{
  expect(paymentProposal(10005,'2030-01-20','2030-01-01')).toMatchObject({down:3002,balance:7003,balanceDue:'2030-01-13',boundaryReview:false});
  expect(PACKAGE_POLICY.WHOLE_HOME_1BR.securityCentavos).toBe(150000);
 });
 it.each([0,1,6,7])('proposes full payment for %i days notice pending owner boundary decision',days=>{
  expect(paymentProposal(10005,`2030-01-${String(1+days).padStart(2,'0')}`,'2030-01-01').down).toBe(10005);
 });
 it('rejects any House Rules content field rather than retaining it',()=>{
  expect(policyOperationSchema.safeParse({action:'POLICY',id:crypto.randomUUID(),key:crypto.randomUUID(),data:{type:'RULES',status:'SENT_EXTERNALLY',genuinely_evidenced:true,contents:'Forbidden'}}).success).toBe(false);
 });
});
