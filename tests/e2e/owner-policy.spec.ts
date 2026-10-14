import {test,expect,type Page} from '@playwright/test';
import {addDays} from '../../src/types/pricing';
test.describe('Slice 9 owner policy against disposable provider',()=>{
 test.skip(process.env.TEN29_PROVIDER_E2E!=='true','Disposable real provider required');
 test.describe.configure({mode:'serial',retries:0});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 async function login(page:Page){await page.goto('/admin/login');await page.getByLabel('Email').fill(process.env.TEN29_E2E_OWNER_EMAIL!);await page.getByLabel('Password').fill(process.env.TEN29_E2E_OWNER_PASSWORD!);await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);page.on('dialog',d=>d.accept());}
 for(const [rooms,guests,width] of [[3,7,390],[1,3,360],[2,5,768]] as const){
  test(`${rooms}BR requested extra guest plus free toddler remains owner controlled`,async({page,request})=>{
   await page.setViewportSize({width,height:844});const start=addDays(today,240+rooms*5),end=addDays(start,2);
   await page.goto('/book');await page.locator('#adults').fill(String(guests));await page.locator('#young_children').fill('1');await page.getByLabel('Bedroom package',{exact:true}).selectOption(`WHOLE_HOME_${rooms}BR`);
   await expect(page.getByLabel('Bedroom package',{exact:true})).toHaveValue(`WHOLE_HOME_${rooms}BR`);
   await expect(page.getByText(`Additional guests needing OWNER approval: 1.`,{exact:false})).toBeVisible();
   await page.locator('#check_in_date').fill(start);await page.locator('#check_out_date').fill(end);
   await page.locator('#full_name').fill(`Synthetic Policy ${rooms}BR`);await page.locator('#mobile_number').fill(`+63917000900${rooms}`);await page.locator('#privacy_consent').check();
   await expect(page.getByRole('region',{name:'Accommodation estimate'})).toContainText('No additional charges are automatically included');
   await page.locator('#young_children').fill('2');await expect(page.getByRole('button',{name:/Send Enquiry/})).toBeEnabled();await page.locator('#young_children').fill('1');await expect(page.getByRole('button',{name:/Send Enquiry/})).toBeEnabled();
   await page.getByRole('button',{name:/Send Enquiry/}).click();await expect(page.getByRole('heading',{name:'Request received'})).toBeVisible();
   await login(page);await page.goto('/admin/requests');await page.getByLabel('Stay window start').fill(start);await page.getByLabel('Stay window end (exclusive)').fill(end);await page.getByLabel('Search guest or reference').fill(`Synthetic Policy ${rooms}BR`);await page.locator('article').filter({hasText:`Synthetic Policy ${rooms}BR`}).getByRole('link').click();const id=page.url().split('/').at(-1)!;
   const panel=page.getByRole('region',{name:'Owner booking policy'});await expect(panel).toContainText(`Countable ${guests}`);await expect(panel).toContainText(`Actual occupants ${guests+1}`);await expect(panel).toContainText('OWNER approved: Pending');
   await page.getByRole('button',{name:'Review request',exact:true}).click();await page.getByRole('button',{name:'Load current nightly rates',exact:true}).click();
   for(const date of [start,addDays(start,1)]){await page.getByLabel(`Manual nightly amount ${date} (PHP, optional)`).fill('100.05');await page.getByLabel(`Manual rate reason ${date}`).fill('Synthetic manual nightly price');}
   await page.getByLabel('I explicitly approve',{exact:false}).check();await page.getByRole('button',{name:'Save quotation draft and preview',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('not accepted');
   await page.getByRole('button',{name:'Approve extra guests and occupancy',exact:true}).click();await expect(panel).toContainText('OWNER approved: 1');
   await page.getByRole('button',{name:'Save quotation draft and preview',exact:true}).click();const preview=page.getByRole('region',{name:'Itemized quotation preview'});
   await expect(preview).toContainText('Final quoted total: PHP 1,000.10');await expect(preview).toContainText('Required down payment: PHP 300.03');await expect(preview).toContainText('2 nights = PHP 800.00');
   await page.getByRole('button',{name:'Issue quotation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('not accepted');
   await page.getByRole('button',{name:'Authorize final payment schedule',exact:true}).click();await page.getByRole('button',{name:'Issue quotation',exact:true}).click();await page.getByRole('button',{name:'Await deposit',exact:true}).click();
   await page.getByLabel('Recorded payment (PHP)').fill('300.03');await page.getByLabel('Payment method',{exact:true}).selectOption('GCASH');await page.getByRole('button',{name:'Record unverified payment',exact:true}).click();
   await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('not accepted');
   await page.getByRole('button',{name:'Verify actual receipt',exact:true}).click();await page.getByRole('button',{name:'Confirm Reservation',exact:true}).click();await expect(page.getByRole('heading',{name:'Reservation CONFIRMED'})).toBeVisible();
   const unavailable=await request.get(`/api/booking-calendar?package_code=WHOLE_HOME_1BR&check_in_date=${start}&check_out_date=${end}&overnight_guest_count=1&folding_foams_requested=false`);expect((await unavailable.json()).unavailable).toHaveLength(1);
   await page.getByLabel('Security collection recorded (PHP)').fill('100.00');await page.getByRole('button',{name:'Record unverified security receipt',exact:true}).click();await expect(panel).toContainText('Recorded: PHP 100.00');await expect(panel).toContainText('Independently verified: PHP 0.00');
   await page.getByRole('button',{name:'Verify security receipt',exact:true}).click();await expect(panel).toContainText('Outstanding liability: PHP 100.00');await expect(preview).toContainText('Verified received: PHP 300.03');
   await page.getByRole('button',{name:'Record external delivery status',exact:true}).click();await expect(panel).toContainText('External House Rules delivery: SENT_EXTERNALLY');
   await page.getByLabel('Recorded payment (PHP)').fill('700.07');await page.getByRole('button',{name:'Record unverified payment',exact:true}).click();await page.getByRole('button',{name:'Verify actual receipt',exact:true}).click();await expect(preview).toContainText('Remaining accommodation balance: PHP 0.00');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/policy-${rooms}br-${width}.png`,fullPage:true});
   if(rooms===3){await page.setViewportSize({width:1280,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/policy-desktop.png',fullPage:true});}
   const body=await page.request.get(`/api/admin/bookings?from=${start}&to=${end}&id=${id}`);const state=await body.json();expect(state.requests[0]).toMatchObject({countable_guest_count:guests,exempt_children_count:1,overnight_guest_count:guests+1});
   expect(state.policy_events.find((e:{type:string})=>e.type==='RULES').data).toEqual({status:'SENT_EXTERNALLY'});
  });
 }
});
