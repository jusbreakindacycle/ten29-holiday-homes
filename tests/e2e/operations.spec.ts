import { test, expect } from '@playwright/test';
test('public liveness reveals no provider configuration and carries defensive headers', async ({ request }) => {
  const result = await request.get('/api/health'); expect(result.status()).toBe(200);
  expect(await result.json()).toEqual({ ok: true }); expect(result.headers()['cache-control']).toContain('no-store');
  expect(result.headers()['x-content-type-options']).toBe('nosniff');
  expect(result.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  const privateResult = await request.get('/api/admin/operations'); expect([403, 503]).toContain(privateResult.status());
  expect(JSON.stringify(await privateResult.json())).not.toMatch(/configuration_issues|reserved_bytes|SUPABASE_SERVICE/);
});
test('privacy reflects implemented processing and mobile public routes have accessible core controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const timings: Record<string, number> = {};
  for (const route of ['/', '/availability', '/book', '/gallery', '/privacy']) {
    const start = Date.now(); await page.goto(route); timings[route] = Date.now() - start;
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close menu', exact: true }).press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
  }
  await expect(page.getByText(/masked references/)).toBeVisible();
  await expect(page.getByText(/No automatic deletion period/)).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('twelve months');
  await page.goto('/book'); await expect(page.getByLabel('Bedroom package', { exact: true })).toHaveAccessibleName('Bedroom package');
  await page.getByLabel('Bedroom package', { exact: true }).focus();
  await expect(page.getByLabel('Bedroom package', { exact: true })).toBeFocused();
  await testInfo.attach('synthetic-route-navigation-timings', { body: JSON.stringify(timings), contentType: 'application/json' });
  console.log('Synthetic local production-server navigation milliseconds:', JSON.stringify(timings));
});
test.describe('protected operational visibility on actual disposable provider', () => {
  test.skip(process.env.TEN29_PROVIDER_E2E !== 'true', 'Disposable provider required');
  test('public account signup is disabled while guest intake remains independent of Auth', async ({ request }) => {
    const result = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      data: { email: 'unauthorized-signup@example.invalid', password: 'Synthetic-only-password-42!' },
    });
    expect(result.status()).toBe(422);
    expect((await result.json()).error_code).toBe('signup_disabled');
  });
  test('OWNER sees aggregate readiness while manager cannot read diagnostics', async ({ page }) => {
    for (const role of ['OWNER', 'MANAGER']) {
      await page.context().clearCookies(); await page.goto('/admin/login');
      await page.getByLabel('Email').fill(process.env[`TEN29_E2E_${role}_EMAIL`]!);
      await page.getByLabel('Password').fill(process.env[`TEN29_E2E_${role}_PASSWORD`]!);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
      await page.goto('/admin/operations'); await page.setViewportSize({ width: 360, height: 800 });
      await page.getByRole('button', { name: 'Refresh diagnostics' }).click();
      if (role === 'OWNER') {
        await expect(page.getByText('reachable', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const response = await page.request.get('/api/admin/operations'); expect(response.status()).toBe(200);
        const data = await response.json(); expect(data.notifications).toHaveProperty('delivery_review');
        expect(JSON.stringify(data)).not.toMatch(/original_key|contact_number|lease_token|guest_name|access_token/);
        await page.screenshot({ path: 'test-results/owner-operations-readiness.png', fullPage: true });
      } else { await expect(page.getByRole('main').getByRole('alert')).toContainText('OWNER access denied'); }
    }
  });
});
