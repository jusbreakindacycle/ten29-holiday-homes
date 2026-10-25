import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieJar, accept, log, GuestBookingError } = vi.hoisted(() => {
 class GuestBookingError extends Error {stage?:string;providerCode?:string;constructor(message:string,stage?:string,providerCode?:string){super(message);this.name='GuestBookingError';this.stage=stage;this.providerCode=providerCode;}}
 return {cookieJar:vi.fn(),accept:vi.fn(),log:vi.fn(),GuestBookingError};
});
vi.mock('next/headers',()=>({cookies:cookieJar}));
vi.mock('next/server',()=>({after:vi.fn()}));
vi.mock('@/services/guest-booking-service',()=>({acceptGuestBooking:accept,deliverBookingNotifications:vi.fn(),GuestBookingError}));
vi.mock('@/lib/booking-session',()=>({BOOKING_COOKIE:'ten29',bookingHash:()=> 'a'.repeat(64),validBookingSession:()=>true}));
vi.mock('@/lib/booking-origin',()=>({isBookingSameOrigin:()=>true}));
vi.mock('@/lib/operational-log',()=>({operationalLog:log}));
import { POST } from '@/app/api/booking-request/route';

describe('booking request failure reporting',()=>{
 beforeEach(()=>{vi.clearAllMocks();cookieJar.mockResolvedValue({get:()=>({value:'synthetic-signed-session'})});});
 afterEach(()=>vi.restoreAllMocks());

 it('returns a retryable status and logs only stage and safe database code on persistence failure',async()=>{
  accept.mockRejectedValueOnce(new GuestBookingError('Request could not be saved. Retry with the same details, or contact TEN29.','response','42883'));
  const request=new Request('http://localhost:3000/api/booking-request',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({mobile_number:'09171234567'})});
  const response=await POST(request);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error:'Request could not be saved. Retry with the same details, or contact TEN29.'});
  expect(log).toHaveBeenCalledWith('booking_intake_failed',{stage:'response',providerCode:'42883'});
  expect(JSON.stringify(log.mock.calls)).not.toContain('SQL');
 });
});
