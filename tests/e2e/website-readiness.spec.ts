import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/', '/property', '/gallery', '/rates', '/availability', '/book', '/location',
  '/faq', '/contact', '/policies', '/privacy', '/terms', '/admin/login',
];

function addDays(date: string, count: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

async function installSyntheticCalendar(page: import('@playwright/test').Page) {
  await page.route('**/api/booking-calendar?**', async route => {
    const url = new URL(route.request().url());
    const from = url.searchParams.get('check_in_date')!;
    const to = url.searchParams.get('check_out_date')!;
    const nights = [];
    for (let date = from; date < to; date = addDays(date, 1)) nights.push({
      date,
      package_code: url.searchParams.get('package_code'),
      amount_centavos: 500000,
      source: 'synthetic-e2e-fixture',
      rate_revision_id: '00000000-0000-4000-8000-000000000001',
    });
    const total = nights.length * 500000;
    await route.fulfill({ json: { estimate: {
      package_code: url.searchParams.get('package_code'),
      check_in_date: from,
      check_out_date: to,
      overnight_guest_count: Number(url.searchParams.get('overnight_guest_count')),
      folding_foams_requested: url.searchParams.get('folding_foams_requested') === 'true',
      bedrooms_opened: Number(url.searchParams.get('package_code')?.slice(-2, -1) ?? 1),
      private_whole_house: true,
      currency: 'PHP',
      estimate_kind: 'ACCOMMODATION_ONLY',
      version: '00000000-0000-4000-8000-000000000002',
      missing_rates: false,
      accommodation_subtotal_centavos: total,
      estimated_total_centavos: total,
      nights,
    }, unavailable: [] } });
  });
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
  for (const width of [1280, 390, 360]) {
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

test('synthetic calendar supports navigation and truthful request failure without saving a booking', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const checkIn = addDays(today, 3);
  const checkOut = addDays(today, 5);
  await page.route('**/api/booking-session', route => route.fulfill({ json: { ready: true } }));
  await installSyntheticCalendar(page);
  await page.route('**/api/booking-request', route => route.fulfill({ status: 503, json: { error: 'Synthetic provider unavailable; no request was saved.' } }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/book');
  await page.locator('#check_in_date').fill(checkIn);
  await page.locator('#check_out_date').fill(checkOut);
  await expect(page.getByRole('region', { name: 'Accommodation estimate' })).toContainText('PHP 10,000.00');
  const monthInput = page.getByLabel('Calendar month');
  const initialMonth = await monthInput.inputValue();
  await page.getByRole('button', { name: 'Next month' }).click();
  const nextMonth = new Date(`${initialMonth}-01T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  await expect(monthInput).toHaveValue(nextMonth.toISOString().slice(0, 7));
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(monthInput).toHaveValue(initialMonth);
  await page.locator('#full_name').fill('Synthetic UI Guest');
  await page.locator('#mobile_number').fill('+639171234567');
  await page.locator('#privacy_consent').check();
  const submit = page.getByRole('button', { name: /Send Enquiry/ });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText('Synthetic provider unavailable; no request was saved.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
});
