import { test, expect } from "@playwright/test";

test.describe("Public site — critical path", () => {
  test("homepage renders the hero, nav, and never claims a Tagaytay location", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request Your Dates" }).first()).toBeVisible();

    const bodyText = await page.locator("body").innerText();
    const lower = bodyText.toLowerCase();
    expect(lower).not.toContain("located in tagaytay"); // "not located in Tagaytay" is fine and expected
    expect(lower).not.toContain("booking confirmed");
    // "no automated instant booking" / "not instant booking" are truthful negations
    // (see docs/13_CONTENT_AND_CLAIM_STANDARD.md) — only an affirmative claim is prohibited.
    expect(/(?<!no automated )(?<!not )instant booking/.test(lower)).toBe(false);
  });

  test("primary navigation reaches every core public page", async ({ page }) => {
    for (const [label, path] of [
      ["Property", "/property"],
      ["Gallery", "/gallery"],
      ["Rates", "/rates"],
      ["FAQ", "/faq"],
      ["Contact", "/contact"],
    ] as const) {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("availability page states enquiries do not reserve a date", async ({ page }) => {
    await page.goto("/availability");
    await expect(page.getByText(/does not place a hold or create a reservation/i).first()).toBeVisible();
  });

  test("policies page never silently fabricates house rules", async ({ page }) => {
    await page.goto("/policies");
    // House rules are PROPOSED_PENDING_APPROVAL in the current claim registry,
    // so the public page must show the pending-state message, not a rules list.
    await expect(page.getByText(/pending publication|being reviewed/i).first()).toBeVisible();
  });

  test("404 page is custom-branded, not the framework default", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});

test.describe("Booking enquiry form", () => {
  test("requires the core fields before submission", async ({ page }) => {
    await page.goto("/book");
    const fullName = page.locator("#full_name");
    await expect(fullName).toHaveAttribute("required", "");
    await expect(page.locator("#mobile_number")).toHaveAttribute("required", "");
    await expect(page.locator("#privacy_consent")).toHaveAttribute("required", "");
  });

  test("submitting a complete form never claims the stay is confirmed", async ({ page }) => {
    await page.goto("/book");

    await page.locator("#full_name").fill("Playwright Test Guest");
    await page.locator("#mobile_number").fill("+639171234567");

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 20);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 22);
    await page.locator("#check_in_date").fill(checkIn.toISOString().slice(0, 10));
    await page.locator("#check_out_date").fill(checkOut.toISOString().slice(0, 10));

    await page.locator("#adults").fill("2");
    await page.locator("#privacy_consent").check();

    // Unconfigured services cannot establish availability or persist requests.
    await expect(page.getByRole("button", { name: /send enquiry/i })).toBeDisabled();
    await expect(page.getByText(/Calendar could not load|Could not verify|temporarily unavailable/).first()).toBeVisible();

    // Without a configured Supabase project in this environment, submission
    // fails gracefully — the important assertion is that the UI never claims
    // success/confirmation it can't back up. See docs/16_TEST_STRATEGY.md.
    const alert = page.getByRole("alert").or(page.getByRole("status"));
    await expect(alert.first()).toBeVisible({ timeout: 15_000 });
    const alertText = (await alert.first().innerText()).toLowerCase();
    expect(alertText).not.toContain("booking confirmed");
    expect(alertText).not.toContain("date reserved");
  });
});

test.describe("Admin", () => {
  test("login page never exposes a self-registration path", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Admin sign-in" })).toBeVisible();
    await expect(page.getByText(/no public registration/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up|register|create account/i })).toHaveCount(0);
  });
});
