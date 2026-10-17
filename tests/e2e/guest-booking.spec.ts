import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
test.describe("Guest booking against disposable Supabase", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  test.skip(process.env.TEN29_PROVIDER_E2E !== "true", "Requires disposable real provider fixtures");
  const dates = (process.env.TEN29_GUEST_DATES || "").split(",");
  let ownerToken = "";
  async function ownerHeaders(request: APIRequestContext) {
    if (!ownerToken) {
      const auth = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, data: { email: process.env.TEN29_E2E_OWNER_EMAIL, password: process.env.TEN29_E2E_OWNER_PASSWORD } });
      ownerToken = (await auth.json()).access_token;
    }
    return { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${ownerToken}` };
  }
  async function rows(request: APIRequestContext, table: string, filter: string) {
    const r = await request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${filter}`, { headers: await ownerHeaders(request) });
    expect(r.ok()).toBe(true); return r.json();
  }
  async function choose(page: Page, pack = "WHOLE_HOME_3BR", from = dates[0], to = dates[2]) {
    await page.goto("/book?source=hero");
    await page.locator("#adults").fill("2");
    await page.getByLabel("Bedroom package", { exact: true }).selectOption(pack);
    await page.locator("#check_in_date").fill(from); await page.locator("#check_out_date").fill(to);
    await expect(page.getByRole("region", { name: "Accommodation estimate" })).toBeVisible();
    await page.locator("#full_name").fill("Synthetic Calendar Guest"); await page.locator("#mobile_number").fill("+639171234567");
    await page.locator("#privacy_consent").check();
    await expect(page.getByRole("button", { name: /Send Enquiry/ })).toBeEnabled();
  }
  test("mobile guest persists linked pair, recovers lost response and owner can inspect it", async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await choose(page);
    await expect(page.getByRole("region", { name: "Accommodation estimate" })).toContainText("PHP 330.00");
    await expect(page.locator(`[data-date="${dates[2]}"]`)).toContainText("Checkout");
    await page.screenshot({ path: "test-results/guest-calendar-mobile.png", fullPage: true });
    let submitted: unknown;
    await page.route("**/api/booking-request", async route => { submitted = route.request().postDataJSON(); await route.fetch(); await route.abort("failed"); });
    await page.getByRole("button", { name: /Send Enquiry/ }).click();
    await expect(page.getByText(/Connection interrupted/)).toBeVisible();
    await page.unroute("**/api/booking-request");
    // A refresh keeps the signed session and stored retry key/snapshot.
    await choose(page);
    await page.getByRole("button", { name: /Send Enquiry/ }).click();
    await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
    const status = page.getByRole("status", { name: "Saved booking request" });
    await expect(status).toContainText("Dates are not reserved");
    const reference = (await status.innerText()).match(/TEN29-[A-F0-9]{32}/)![0];
    const enquiries = await rows(request, "inquiries", `reference_code=eq.${reference}&select=*`);
    expect(enquiries).toHaveLength(1);
    expect(enquiries[0]).toMatchObject({ source: "website", utm_source: "hero" });
    const linked = await rows(request, "booking_requests", `inquiry_id=eq.${enquiries[0].id}&select=*`);
    expect(linked).toHaveLength(1); expect(linked[0]).toMatchObject({ source: "WEBSITE", status: "NEW", package_code: "WHOLE_HOME_3BR", overnight_guest_count: 2, created_by: null });
    const snapshots = await rows(request, "website_booking_intakes", `request_id=eq.${linked[0].id}&select=estimate`);
    expect(snapshots[0].estimate.estimated_total_centavos).toBe(33000);
    expect(await rows(request, "booking_notification_outbox", `request_id=eq.${linked[0].id}&select=status`)).toEqual([{ status: "PENDING" }]);
    expect(await rows(request, "booking_quotes", `request_id=eq.${linked[0].id}&select=id`)).toHaveLength(0);
    const same = await page.request.post("/api/booking-request", { data: submitted, headers: { Origin: "http://127.0.0.1:3000" } });
    expect((await same.json()).reference_code).toBe(reference);
    await page.screenshot({ path: "test-results/guest-request-mobile.png", fullPage: true });
    await page.goto("/admin/login"); await page.getByLabel("Email").fill(process.env.TEN29_E2E_OWNER_EMAIL!);
    await page.getByLabel("Password").fill(process.env.TEN29_E2E_OWNER_PASSWORD!); await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/inquiries/${enquiries[0].id}`);
    await expect(page.getByText("Linked website booking request")).toBeVisible();
    await page.getByRole("link", { name: "View booking request and saved estimate" }).click();
    await expect(page.getByText("PHP 330.00", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/No quotation, deposit terms or reservation was automatically created/)).toBeVisible();
  });
  test("stale prices require explicit acknowledgement before durable submission", async ({ page, request }) => {
    await choose(page); await page.locator("#full_name").fill("Synthetic Changed Price Guest");
    const auth = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, data: { email: process.env.TEN29_E2E_OWNER_EMAIL, password: process.env.TEN29_E2E_OWNER_PASSWORD } });
    const token = (await auth.json()).access_token;
    const h = { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` };
    const rpc = async (name: string, data: unknown) => { const r = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, { headers: h, data }); expect(r.ok()).toBe(true); return r.json(); };
    const state = await rpc("read_owner_rate_state", { p_package: "WHOLE_HOME_3BR" });
    const rules = state.published_rules.map((r: { kind: string; amount_centavos: number }) => ({ ...r, amount_centavos: r.kind === "RANGE" ? 15000 : r.amount_centavos }));
    const rev = await rpc("save_calendar_rate_draft", { p_package: "WHOLE_HOME_3BR", p_base: state.published_revision_id, p_rules: rules, p_key: crypto.randomUUID() });
    await rpc("publish_calendar_rate_revision", { p_revision: rev, p_base: state.published_revision_id, p_key: crypto.randomUUID() });
    await page.getByRole("button", { name: /Send Enquiry/ }).click();
    await expect(page.getByText(/Published prices changed/)).toBeVisible();
    expect(await rows(request, "inquiries", "full_name=eq.Synthetic%20Changed%20Price%20Guest&select=id")).toHaveLength(0);
    await expect(page.getByRole("region", { name: "Accommodation estimate" })).toContainText("PHP 370.00");
    await expect(page.getByRole("button", { name: /Send Enquiry/ })).toBeDisabled();
    await page.getByRole("button", { name: "I acknowledge the updated estimate" }).click();
    await page.getByRole("button", { name: /Send Enquiry/ }).click();
    await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  });
  test("missing rates allow an honest request; capacities preserve larger purchases", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 }); await choose(page, "WHOLE_HOME_2BR");
    const targets = await page.locator("[data-date]").evaluateAll(nodes => nodes.map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
    expect(targets.every(t => t.width >= 44 && t.height >= 44)).toBe(true);
    await expect(page.getByRole("region", { name: "Accommodation estimate" })).toContainText("Request a quote");
    await page.locator("#full_name").fill("Synthetic Missing Rate Guest");
    await page.getByRole("button", { name: /Send Enquiry/ }).click(); await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
    await page.goto("/book"); await page.getByLabel("Bedroom package", { exact: true }).selectOption("WHOLE_HOME_3BR");
    await page.locator("#adults").fill("2"); await expect(page.getByLabel("Bedroom package", { exact: true })).toHaveValue("WHOLE_HOME_3BR");
    await page.locator("#adults").fill("7"); await expect(page.getByLabel(/Additional folding foams/)).toBeChecked();
    await page.locator("#children").fill("2"); await expect(page.getByText("Choose between 1 and 8 countable guests.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
  test("calendar blocks the whole house, supports keyboard/year navigation and adjacent checkout", async ({ page, request }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); await page.goto("/availability");
    await page.getByLabel("Bedroom package", { exact: true }).selectOption("WHOLE_HOME_3BR");
    await page.getByLabel("Calendar month").fill(dates[0].slice(0, 7));
    await expect(page.locator(`[data-date="${dates[0]}"]`)).toBeEnabled();
    await expect(page.locator(`[data-date="${dates[3]}"]`)).toBeDisabled();
    await expect(page.locator(`[data-date="${dates[4]}"]`)).toBeDisabled();
    await page.locator(`[data-date="${dates[0]}"]`).focus(); await page.keyboard.press("ArrowRight");
    await expect(page.locator(`[data-date="${dates[1]}"]`)).toBeFocused();
    await page.getByLabel("Calendar month").fill("2027-12");
    await expect(page.locator('[data-date="2027-12-31"]')).toBeEnabled();
    await page.locator('[data-date="2027-12-31"]').focus(); await page.keyboard.press("ArrowRight");
    await expect(page.getByLabel("Calendar month")).toHaveValue("2028-01");
    await expect(page.locator('[data-date="2028-01-01"]')).toBeFocused();
    await page.getByLabel("Calendar month").fill(dates[0].slice(0, 7));
    await page.locator("#check_in_date").fill(dates[2]); await page.locator("#check_out_date").fill(dates[3]);
    await expect(page.getByRole("region", { name: "Accommodation estimate" })).toBeVisible();
    await expect(page.getByText("This stay includes unavailable nights.")).toHaveCount(0);
    const r = await request.get(`/api/booking-calendar?package_code=WHOLE_HOME_3BR&overnight_guest_count=2&folding_foams_requested=false&check_in_date=${dates[3]}&check_out_date=${dates[5]}`);
    const b = await r.json(); expect(b.unavailable.length).toBeGreaterThan(0);
    expect(JSON.stringify(b)).not.toMatch(/full_name|mobile_number|payment|owner_id|reason/);
  });
  test("public endpoint rejects mass assignment, honeypot and cross-origin submissions without fake success", async ({ page }) => {
    await choose(page); let payload: Record<string, unknown> = {};
    await page.route("**/api/booking-request", async route => { payload = route.request().postDataJSON(); await route.abort(); });
    await page.getByRole("button", { name: /Send Enquiry/ }).click(); await expect(page.getByText(/Connection interrupted/)).toBeVisible();
    await page.unroute("**/api/booking-request");
    for (const extra of [{ source: "PHONE" }, { status: "CONFIRMED" }, { website: "bot-filled" }, { privacy_consent: false }, { adults: 9 }]) {
      const r = await page.request.post("/api/booking-request", { data: { ...payload, ...extra }, headers: { Origin: "http://127.0.0.1:3000" } });
      expect(r.ok()).toBe(false); expect((await r.json()).outcome).not.toBe("SAVED");
    }
    const r = await page.request.post("/api/booking-request", { data: payload, headers: { Origin: "https://example.invalid" } }); expect(r.status()).toBe(403);
  });
  test("secure-session failure is visible and retry restores the genuine request path", async ({ page }) => {
    await page.route("**/api/booking-session", route => route.abort("failed"));
    await page.goto("/book"); await expect(page.getByText("Secure request session could not start. Retry or contact TEN29.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Enquiry/ })).toBeDisabled();
    await page.unroute("**/api/booking-session");
    await page.getByRole("button", { name: "Retry secure session" }).click();
    await expect(page.getByRole("button", { name: "Retry secure session" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Request received" })).toHaveCount(0);
  });
});
