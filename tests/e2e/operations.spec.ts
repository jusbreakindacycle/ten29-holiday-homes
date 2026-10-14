import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
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
  await page.goto('/book');
  const packageSelect = page.getByLabel('Bedroom package', { exact: true });
  await expect(packageSelect).toHaveAccessibleName('Bedroom package');
  await expect(packageSelect).toBeEnabled();
  await packageSelect.focus();
  await expect(packageSelect).toBeFocused();
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
  test('revoking membership blocks an already authenticated OWNER session', async ({ page, request }) => {
    if (process.env.CI !== 'true' || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw Error('Disposable CI only');
    await page.goto('/admin/login'); await page.getByLabel('Email').fill(process.env.TEN29_E2E_OWNER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEN29_E2E_OWNER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
    const auth = await request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      data: { email: process.env.TEN29_E2E_OWNER_EMAIL, password: process.env.TEN29_E2E_OWNER_PASSWORD },
    });
    expect(auth.ok()).toBe(true); const identity = await auth.json(); const id = identity.user.id;
    expect(identity.user.email).toBe('ui-owner@example.invalid'); expect(id).toMatch(/^[0-9a-f-]{36}$/);
    function sql(statement: string) {
      return execFileSync('docker', ['exec', '-i', 'supabase_db_ten29-holiday-homes', 'psql', '-X', '-Atq', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: statement, encoding: 'utf8' }).trim();
    }
    const created = sql(`select created_at::text from public.ten29_admins where user_id='${id}';`);
    expect(created).toMatch(/^[0-9:. +\-]+$/);
    try {
      sql(`delete from public.ten29_admins where user_id='${id}';`);
      expect((await page.request.get('/api/admin/operations')).status()).toBe(403);
      expect((await page.request.get('/api/admin/bookings?from=2030-01-01&to=2030-02-01')).status()).toBe(403);
      const records = await request.get('http://127.0.0.1:54321/rest/v1/booking_requests?select=id', {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${identity.access_token}` },
      });
      expect(records.ok()).toBe(true); expect(await records.json()).toEqual([]);
    } finally { sql(`insert into public.ten29_admins(user_id,role,created_at) values('${id}','OWNER','${created}'::timestamptz);`); }
  });
});
