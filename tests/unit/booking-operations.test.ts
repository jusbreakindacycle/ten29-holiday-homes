import {describe,it,expect} from 'vitest';
import {manualRequestSchema,operationSchema} from '@/types/operations';
import {OWNER_POLICY_VERSION} from '@/types/owner-policy';
const manual={source:'MESSENGER',package_code:'WHOLE_HOME_3BR',overnight_guest_count:2,folding_foams_requested:false,check_in_date:'2035-12-31',check_out_date:'2036-01-02',full_name:'Synthetic Guest',contact_number:'555-0100',email:'',notes:''};
describe('owner booking operation boundaries',()=>{
 it('preserves a larger purchased package for small groups across years',()=>expect(manualRequestSchema.parse(manual).package_code).toBe('WHOLE_HOME_3BR'));
 it('requires adequate folding foams above six and rejects over eight',()=>{expect(manualRequestSchema.safeParse({...manual,overnight_guest_count:8}).success).toBe(false);expect(manualRequestSchema.safeParse({...manual,overnight_guest_count:8,folding_foams_requested:true}).success).toBe(true);expect(manualRequestSchema.safeParse({...manual,overnight_guest_count:9,folding_foams_requested:true}).success).toBe(false);});
 it('allows approved-extra requests in 1BR/2BR without foams and rejects their foam option',()=>{
  for(const [package_code,count] of [['WHOLE_HOME_1BR',3],['WHOLE_HOME_2BR',5]] as const){
   const policy={...manual,package_code,overnight_guest_count:count,folding_foams_requested:false,policy_version:OWNER_POLICY_VERSION,
    adults_count:count,older_children_count:0,exempt_children_count:0};
   expect(manualRequestSchema.safeParse(policy).success).toBe(true);
   expect(manualRequestSchema.safeParse({...policy,folding_foams_requested:true}).success).toBe(false);
  }
 });
 it('rejects spoofed website sources, linked enquiry IDs and paid flags',()=>{for(const extra of [{source:'WEBSITE'},{inquiry_id:crypto.randomUUID()},{confirmed:true}])expect(manualRequestSchema.safeParse({...manual,...extra}).success).toBe(false);});
 it('rejects reversed dates and invalid calendar dates',()=>{expect(manualRequestSchema.safeParse({...manual,check_out_date:'2035-01-01'}).success).toBe(false);expect(manualRequestSchema.safeParse({...manual,check_in_date:'2035-02-30'}).success).toBe(false);});
 it('rejects client payment verification flags and unmasked account references',()=>{const p={action:'PAYMENT',id:crypto.randomUUID(),key:crypto.randomUUID(),data:{amount_centavos:2500,payment_method:'Synthetic cash',masked_reference:'***1234'}};expect(operationSchema.safeParse(p).success).toBe(true);expect(operationSchema.safeParse({...p,data:{...p.data,verified:true}}).success).toBe(false);expect(operationSchema.safeParse({...p,data:{...p.data,masked_reference:'123456'}}).success).toBe(false);});
 it('requires explicit unresolved refund review for cancellation',()=>{const p={action:'CANCEL',id:crypto.randomUUID(),key:crypto.randomUUID(),data:{reason:'Synthetic cancellation',refund_review_acknowledged:false}};expect(operationSchema.safeParse(p).success).toBe(false);expect(operationSchema.safeParse({...p,data:{...p.data,refund_review_acknowledged:true}}).success).toBe(true);});
});
