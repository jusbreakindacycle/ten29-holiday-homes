import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/', '/property', '/gallery', '/book', '/location',
  '/faq', '/contact', '/policies', '/privacy', '/terms', '/admin/login',
];

function addDays(date: string, count: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

async function installSyntheticCalendar(page: import('@playwright/test').Page) {
  await page.route('**/api/booking-calendar?**', route => route.fulfill({ json: { unavailable: [] } }));
  await page.route('**/api/promotion-teaser?**', route => route.fulfill({ json: { promotion: null } }));
}

test('public routes render without overflow or hydration exceptions at desktop and narrow mobile widths', async ({ page }) => {
  const exceptions: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', error => exceptions.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText ?? 'failed';
    // Calendar reads are deliberately aborted when the page/effect is replaced.
    if (reason !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${request.url()}: ${reason}`);
  });
  await installSyntheticCalendar(page);
  for (const width of [1280, 390, 375, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `${route} overflows at ${width}px`).toBe(false);
      const brokenLoadedImages = await page.locator('img:not([loading="lazy"])').evaluateAll(images =>
        images.filter(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length);
      expect(brokenLoadedImages, `${route} has a loaded broken image at ${width}px`).toBe(0);
      // A fresh Playwright Chromium context has no browser extensions installed.
      if (route === '/') {
        expect(await page.locator('body').getAttribute('data-new-gr-c-s-check-loaded')).toBeNull();
        expect(await page.locator('body').getAttribute('data-gr-ext-installed')).toBeNull();
      }
    }
  }
  expect(exceptions).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test('synthetic calendar carries a requested stay without disclosing rates and reports a failed request truthfully', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const checkIn = addDays(today, 3);
  const checkOut = addDays(today, 5);
  await page.route('**/api/booking-session', route => route.fulfill({ json: { ready: true } }));
  await installSyntheticCalendar(page);
  await page.route('**/api/booking-request', route => route.fulfill({ status: 503, json: { error: 'Synthetic provider unavailable; no request was saved.' } }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/book?source=website-readiness');
  await expect(page.getByText(/Check-in from 3:00 PM · Check-out before 12:00 PM/)).toBeVisible();
  await page.locator('#check_in_date').fill(checkIn);
  await page.locator('#check_out_date').fill(checkOut);
  await expect(page.getByRole('region', { name: 'Owner quotation' })).toContainText('TEN29 does not display rates online');
  await expect(page.getByRole('region', { name: 'Owner quotation' })).toContainText('send a complete quote');
  await expect(page.getByText('PHP', { exact: false })).toHaveCount(0);
  await expect(page.getByText('MISSING', { exact: false })).toHaveCount(0);
  const monthInput = page.getByLabel('Calendar month');
  const initialMonth = await monthInput.inputValue();
  await page.getByRole('button', { name: 'Next month' }).click();
  const nextMonth = new Date(`${initialMonth}-01T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  await expect(monthInput).toHaveValue(nextMonth.toISOString().slice(0, 7));
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(monthInput).toHaveValue(initialMonth);
  await expect(page).toHaveURL(/\/book\?/);
  await expect(page.getByText('Your selected stay', { exact: true })).toBeVisible();
  // The booking journey stays on one page; the selected stay remains editable beside its review summary.
  await expect(page.getByLabel('Bedroom package', { exact: true })).toHaveValue('WHOLE_HOME_1BR');
  await page.reload();
  await expect(page.getByText('Your selected stay', { exact: true })).toBeVisible();
  await page.locator('#full_name').fill('Synthetic UI Guest');
  await page.locator('#mobile_number').fill('09171234567');
  await page.locator('#privacy_consent').check();
  const submit = page.getByRole('button', { name: /Send Enquiry/ });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText('Synthetic provider unavailable; no request was saved.')).toBeVisible();
  await expect(page.locator('#full_name')).toHaveValue('Synthetic UI Guest');
  await expect(page.locator('#mobile_number')).toHaveValue('09171234567');
  await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
});

test('an eligible approved promotion is clear per night and remains readable on mobile and desktop', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.route('**/api/booking-session', route => route.fulfill({ json: { ready: true } }));
  await installSyntheticCalendar(page);
  await page.unroute('**/api/promotion-teaser?**');
  await page.route('**/api/promotion-teaser?**', route => route.fulfill({ json: { promotion: {
    package_code: 'WHOLE_HOME_1BR', former_amount_centavos: 50000, promotional_amount_centavos: 40000,
    minimum_nights: 2, maximum_nights: 5, price_basis: 'PER_NIGHT',
  } } }));
  await page.goto('/book');
  await page.locator('#check_in_date').fill(addDays(today, 7));
  await page.locator('#check_out_date').fill(addDays(today, 9));
  const teaser = page.getByRole('region', { name: 'Promotional accommodation starting price' });
  await expect(teaser).toContainText('Starts at ₱400.00');
  await expect(teaser.locator('del')).toContainText('₱500.00 per night');
  await expect(teaser).toContainText('1-bedroom package');
  await expect(teaser).toContainText('Final accommodation pricing depends on your selected dates, bedroom package, guest count, and any approved extras. Request a formal quotation before payment.');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(teaser).toBeVisible();
  }
});

test('missing promotion dependency blocks intake until a retry confirms the no-promotion fallback', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  let promotionReads = 0;
  let requestWrites = 0;
  await page.route('**/api/booking-session', route => route.fulfill({ json: { ready: true } }));
  await page.route('**/api/booking-calendar?**', route => route.fulfill({ json: { unavailable: [] } }));
  await page.route('**/api/promotion-teaser?**', route => {
    promotionReads += 1;
    return promotionReads === 1
      ? route.fulfill({ status: 503, json: { error: 'Promotion details unavailable.' } })
      : route.fulfill({ json: { promotion: null } });
  });
  await page.route('**/api/booking-request', route => {
    requestWrites += 1;
    return route.fulfill({ status: 503, json: { error: 'Synthetic provider unavailable; no request was saved.' } });
  });

  await page.goto('/book');
  await page.locator('#check_in_date').fill(addDays(today, 7));
  await page.locator('#check_out_date').fill(addDays(today, 9));
  const submit = page.getByRole('button', { name: /Send Enquiry/ });
  await expect(page.getByText(/Promotional details could not be checked/)).toBeVisible();
  await page.locator('#full_name').fill('Synthetic Promotion Retry Guest');
  await page.locator('#mobile_number').fill('09171234567');
  await page.locator('#privacy_consent').check();
  await expect(submit).toBeDisabled();
  expect(requestWrites).toBe(0);

  await page.getByRole('button', { name: 'Retry promotion check' }).click();
  await expect(page.getByText(/No approved promotional starting price applies/)).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText('Synthetic provider unavailable; no request was saved.')).toBeVisible();
  expect(requestWrites).toBe(1);
  await expect(page.locator('#full_name')).toHaveValue('Synthetic Promotion Retry Guest');
  await expect(page.locator('#mobile_number')).toHaveValue('09171234567');
  await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
});

test('direct booking visits render date selection without an unverified form', async ({ page }) => {
  await page.goto('/book');
  await expect(page.getByLabel('Bedroom package', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Send Enquiry/ })).toHaveCount(0);
});
