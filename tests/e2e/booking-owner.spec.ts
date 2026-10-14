import {test,expect,type Page} from '@playwright/test';
import {addDays} from '../../src/types/pricing';
test.describe('Owner booking operations against disposable Supabase',()=>{
 test.skip(process.env.TEN29_PROVIDER_E2E!=='true','Disposable real provider fixture required');
 test.describe.configure({mode:'serial',retries:0});
 const base=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const start=addDays(base,120),end=addDays(base,122);let website='',manual='';
 async function login(page:Page,role='OWNER'){await page.goto('/admin/login');await page.getByLabel('Email').fill(process.env[`TEN29_E2E_${role}_EMAIL`]!);await page.getByLabel('Password').fill(process.env[`TEN29_E2E_${role}_PASSWORD`]!);await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);}
 async function quoteAndDeposit(page:Page,id:string){
  await page.goto(`/admin/requests/${id}`);await expect(page.getByRole('heading',{name:'Booking request',exact:true})).toBeVisible();
  page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Review request',exact:true}).click();await expect(page.getByText('Request: REVIEWING',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Load current nightly rates',exact:true}).click();
  for(const day of [start,addDays(start,1)]){await page.getByLabel(`Manual nightly amount ${day} (PHP, optional)`).fill('100.01');await page.getByLabel(`Manual rate reason ${day}`).fill('Synthetic owner-approved exception');}
  await page.getByRole('button',{name:'Add booking adjustment',exact:true}).click();await page.getByLabel('Adjustment description').fill('Synthetic private arrangement');await page.getByLabel('Unit amount (PHP)').fill('10.00');await page.getByLabel('Approval reason').fill('Synthetic owner approval');
  await page.getByRole('button',{name:'Add booking adjustment',exact:true}).click();const discount=page.getByRole('group',{name:'Adjustment 2',exact:true});await discount.getByLabel('Adjustment type').selectOption('DISCOUNT');await discount.getByLabel('Adjustment description').fill('Synthetic agreed discount');await discount.getByLabel('Unit amount (PHP)').fill('5.00');await discount.getByLabel('Approval reason').fill('Synthetic owner discount approval');
  await page.getByLabel('Required down payment (PHP, owner-approved)').fill('25.00');await page.getByLabel('Refundable security deposit (PHP, optional)').fill('5.00');
  await page.getByLabel('I explicitly approve', {exact:false}).check();await page.getByRole('button',{name:'Save quotation draft and preview',exact:true}).click();
  await expect(page.getByRole('region',{name:'Itemized quotation preview'})).toContainText('Final quoted total: PHP 205.02');
  await expect(page.getByRole('region',{name:'Itemized quotation preview'})).toContainText('Refundable security deposit: PHP 5.00');
  await page.getByRole('button',{name:'Issue quotation',exact:true}).click();await expect(page.getByText(/Revision 1 · ISSUED/)).toBeVisible();
  await page.getByRole('button',{name:'Await deposit',exact:true}).click();await expect(page.getByText('Request: AWAITING DEPOSIT',{exact:true})).toBeVisible();
  await page.getByLabel('Recorded payment (PHP)').fill('25.00');await page.getByLabel('Payment method',{exact:true}).fill('Synthetic cash');await page.getByLabel('Masked reference').fill('***1234');await page.getByRole('button',{name:'Record unverified payment',exact:true}).click();
  await expect(page.getByText(/PHP 25.00 · RECORDED_UNVERIFIED/)).toBeVisible();
  await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('Operation was not accepted');
  await page.getByRole('button',{name:'Verify actual receipt',exact:true}).click();await expect(page.getByText(/PHP 25.00 · VERIFIED/)).toBeVisible();
  await expect(page.getByRole('region',{name:'Itemized quotation preview'})).toContainText('revision 1 · ISSUED');
  await expect(page.getByRole('region',{name:'Itemized quotation preview'})).toContainText('Verified received: PHP 25.00 · Remaining accommodation balance: PHP 180.02');
 }
 test('guest website request reaches owner quotation, real independent verification and atomic confirmation',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/book');await page.locator('#adults').fill('2');await page.getByLabel('Bedroom package',{exact:true}).selectOption('WHOLE_HOME_3BR');await page.locator('#check_in_date').fill(start);await page.locator('#check_out_date').fill(end);
  await page.locator('#full_name').fill('Synthetic Slice Seven Guest');await page.locator('#mobile_number').fill('+639170001234');await page.locator('#privacy_consent').check();
  await page.getByRole('button',{name:/Send Enquiry/}).click();await expect(page.getByRole('heading',{name:'Request received'})).toBeVisible();
  await login(page);await page.goto('/admin/requests');await page.getByLabel('Search guest or reference').fill('Synthetic Slice Seven Guest');const detailLink=page.locator('article').getByRole('link');await expect(detailLink).toBeVisible();const href=(await detailLink.getAttribute('href'))!;expect(href).toMatch(/^\/admin\/requests\/[a-f0-9-]{36}$/);website=href.split('/').pop()!;await detailLink.click();await expect(page).toHaveURL(href);
  await quoteAndDeposit(page,website);await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('heading',{name:'Reservation CONFIRMED',exact:true})).toBeVisible();
  for(const pkg of ['WHOLE_HOME_1BR','WHOLE_HOME_2BR','WHOLE_HOME_3BR']){const r=await request.get(`/api/booking-calendar?package_code=${pkg}&check_in_date=${start}&check_out_date=${end}&overnight_guest_count=1&folding_foams_requested=false`);expect((await r.json()).unavailable).toContainEqual({check_in_date:start,check_out_date:end});}
  await page.goto('/admin/reservations');await expect(page.getByText(`Arrival ${start} from 3:00 PM`).first()).toBeVisible();
  for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/owner-booking-reservation-mobile.png',fullPage:true});
 });
 test('manual Messenger request follows same quote and deposit safeguards; overlap fails and cancellation is atomic',async({page,request})=>{
  await login(page);page.on('dialog',d=>d.accept());await page.goto('/admin/requests/new');
  await page.getByLabel('Guest full name').fill('Synthetic Messenger Guest');await page.getByLabel('Contact number',{exact:true}).fill('555-0100');await page.getByLabel('Overnight guests',{exact:true}).fill('2');await page.getByLabel('Bedroom package',{exact:true}).selectOption('WHOLE_HOME_3BR');await page.getByLabel('Check-in date',{exact:true}).fill(start);await page.getByLabel('Check-out date',{exact:true}).fill(end);await page.getByRole('button',{name:'Review current availability',exact:true}).click();
  await page.getByRole('button',{name:'Save manual request',exact:true}).click();const link=page.getByRole('link',{name:'Open saved manual request'});await expect(link).toBeVisible();manual=(await link.getAttribute('href'))!.split('/').pop()!;
  await quoteAndDeposit(page,manual);await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('Operation was not accepted');
  await page.goto(`/admin/requests/${website}`);await page.getByLabel('Lifecycle reason').fill('Synthetic cancellation; manual refund review');await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();await expect(page.getByRole('heading',{name:'Reservation CANCELLED',exact:true})).toBeVisible();await expect(page.getByText('Refund/payment review remains outstanding. No refund automatically sent.')).toBeVisible();
  await page.goto(`/admin/requests/${manual}`);await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('heading',{name:'Reservation CONFIRMED',exact:true})).toBeVisible();
  const read=await request.get(`/api/booking-calendar?package_code=WHOLE_HOME_1BR&check_in_date=${start}&check_out_date=${end}&overnight_guest_count=1&folding_foams_requested=false`);expect((await read.json()).unavailable).toHaveLength(1);
 });
 test('owner creates and releases audited date block; mobile calendar keeps pending overlays distinct',async({page,request})=>{
  await login(page);page.on('dialog',d=>d.accept());await page.goto('/admin/calendar');await page.getByLabel('Calendar month').fill(start.slice(0,7));const blockStart=addDays(start,5),blockEnd=addDays(start,6);await page.getByLabel('Calendar month').fill(blockStart.slice(0,7));await page.getByLabel('Block start date').fill(blockStart);await page.getByLabel('Block end date').fill(blockEnd);await page.getByRole('button',{name:'Create owner block',exact:true}).click();
  await page.getByRole('button',{name:new RegExp(`${blockStart}, unavailable`)}).click();await expect(page.getByRole('button',{name:'Release block',exact:true})).toBeVisible();await page.getByRole('button',{name:'Release block',exact:true}).click();await expect(page.getByRole('button',{name:new RegExp(`${blockStart}, available`)})).toBeVisible();
  const r=await request.get(`/api/booking-calendar?package_code=WHOLE_HOME_1BR&check_in_date=${blockStart}&check_out_date=${blockEnd}&overnight_guest_count=1&folding_foams_requested=false`);expect((await r.json()).unavailable).toHaveLength(0);
  await page.getByLabel('Calendar month').fill(start.slice(0,7));await page.setViewportSize({width:360,height:800});await expect(page.getByRole('button',{name:new RegExp(`${start}, unavailable`)})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/owner-calendar-mobile.png',fullPage:true});
 });
 test('manager review access does not authorize quotes, receipt verification, confirmation or cancellation',async({page,request})=>{
  await login(page,'MANAGER');await page.goto(`/admin/requests/${manual}`);await expect(page.getByRole('heading',{name:'Reservation CONFIRMED'})).toBeVisible();await expect(page.getByRole('button',{name:'Cancel reservation'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Issue quotation'})).toHaveCount(0);
  const response=await page.request.post('/api/admin/bookings',{headers:{Origin:'http://127.0.0.1:3000'},data:{action:'COMPLETE',id:crypto.randomUUID(),key:crypto.randomUUID(),data:{reason:'Forged',refund_review_acknowledged:false}}});expect(response.status()).toBe(400);
  const anonymous=await request.get(`/api/admin/bookings?from=${start}&to=${end}&id=${manual}`);expect(anonymous.status()).toBe(403);expect(await anonymous.text()).not.toContain('555-0100');
 });
});
