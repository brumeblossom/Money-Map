import { expect, test } from "@playwright/test";

test.describe("Privacy Policy & Terms of Use (Prompt 21c)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. /privacy and /terms load when signed out (no redirect)", async ({ page }) => {
    // 1. Privacy policy
    await page.goto("/privacy");
    await expect(page).toHaveURL(/.*\/privacy/);
    await expect(page).toHaveTitle(/Privacy policy/);
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
    await expect(page.getByText("Last updated: 13-11-2026")).toBeVisible();
    await expect(page.getByText("workwithbrume@gmail.com").first()).toBeVisible();

    // 2. Terms of use
    await page.goto("/terms");
    await expect(page).toHaveURL(/.*\/terms/);
    await expect(page).toHaveTitle(/Terms of use/);
    await expect(page.getByRole("heading", { name: "Terms of use", level: 1 })).toBeVisible();
    await expect(page.getByText("Last updated: 13-11-2026")).toBeVisible();
    await expect(page.getByText("workwithbrume@gmail.com").first()).toBeVisible();
  });

  test("2. /privacy and /terms load when signed in / as guest without redirect to Home", async ({
    page,
    context,
  }) => {
    // Set guest cookies
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "mm_guest", value: "1", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/privacy");
    await expect(page).toHaveURL(/.*\/privacy/);
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();

    await page.goto("/terms");
    await expect(page).toHaveURL(/.*\/terms/);
    await expect(page.getByRole("heading", { name: "Terms of use", level: 1 })).toBeVisible();
  });

  test("3. Header BrandLogo and Back to home links return to '/'", async ({ page }) => {
    await page.goto("/privacy");

    // Header logo links to /
    const headerLogo = page.locator('header a[aria-label="Moneyrails home"]');
    await expect(headerLogo).toBeVisible();
    await expect(headerLogo).toHaveAttribute("href", "/");

    // Back to home link
    const backLink = page.getByRole("link", { name: "Back to home" }).first();
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("4. Landing page footer contains Privacy and Terms links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const privacyLink = footer.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText("Privacy");

    const termsLink = footer.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText("Terms");
  });

  test("5. Sign-up card contains agreement line with Terms and Privacy policy links", async ({
    page,
  }) => {
    await page.goto("/welcome?mode=signup");

    const agreementText = page.getByText(/By creating an account you agree to our/i);
    await expect(agreementText).toBeVisible();

    const termsLink = agreementText.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText("Terms");

    const privacyLink = agreementText.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText("Privacy policy");
  });

  test("6. Settings page contains Privacy policy and Terms of use links", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "mm_guest", value: "1", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/settings");
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText("Privacy policy");

    const termsLink = page.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText("Terms of use");
  });

  test("7. No horizontal scroll on mobile viewport (360px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });

    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test("8. Theme toggle works and pages are readable in dark and light modes", async ({
    page,
  }) => {
    await page.goto("/privacy");
    const themeBtn = page.getByTestId("theme-toggle-btn");
    await expect(themeBtn).toBeVisible();

    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(300);

    // Ensure content is still visible and readable
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();

    // Toggle back
    await themeBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  });
});
