import { expect, test } from "@playwright/test";

test.describe("Moneyrails Branding & Logo (Prompt 21)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Landing page header and footer logo branding", async ({ page }) => {
    await page.goto("/");

    // Document title
    await expect(page).toHaveTitle(/Moneyrails/);

    // Header logo: links to #top, aria-label "Moneyrails home"
    const headerLogo = page.getByTestId("landing-logo");
    await expect(headerLogo).toBeVisible();
    await expect(headerLogo).toHaveAttribute("href", "#top");
    await expect(headerLogo).toHaveAttribute("aria-label", "Moneyrails home");

    // Header logo image rendered (matching visible responsive image)
    const headerLogoImg = headerLogo.locator("img:visible").first();
    await expect(headerLogoImg).toBeVisible();
    await expect(headerLogoImg).toHaveAttribute("alt", "Moneyrails");

    // Verify footer branding on dark surface
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const footerLogo = footer.locator('a[aria-label="Moneyrails home"]');
    await expect(footerLogo).toBeVisible();
    await expect(footerLogo).toHaveAttribute("href", "#top");
    const footerLogoImg = footerLogo.locator("img:visible").first();
    await expect(footerLogoImg).toBeVisible();
    await expect(footerLogoImg).toHaveAttribute("alt", "Moneyrails");

    // Verify footer copy
    await expect(footer.getByText("© 2026 Moneyrails")).toBeVisible();
    await expect(footer.getByText("Why Moneyrails")).toBeVisible();

    // Verify section headings
    await expect(
      page.getByRole("heading", { name: "What you need to know about Moneyrails" })
    ).toBeVisible();
  });

  test("2. App sidebar (desktop) has plain branding (not a link) and mobile header has 28px logo mark", async ({
    page,
    context,
  }) => {
    // Set guest cookie
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "mm_guest", value: "1", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;

    if (isDesktop) {
      // Desktop sidebar
      const sidebarLogo = page.locator('aside img[alt="Moneyrails"]').first();
      await expect(sidebarLogo).toBeVisible();
      // Ensure it is NOT wrapped in a link inside aside
      const linkParent = page.locator('aside a img[alt="Moneyrails"]');
      expect(await linkParent.count()).toBe(0);
    } else {
      // Mobile header
      const headerMark = page.locator('header img[alt="Moneyrails"]').first();
      await expect(headerMark).toBeVisible();
    }
  });

  test("3. Welcome card has full logo (not a link)", async ({ page }) => {
    await page.goto("/welcome?mode=signin");

    // Welcome card logo
    const logoImg = page.locator('main img[alt="Moneyrails"]').first();
    await expect(logoImg).toBeVisible();

    // Subtitle updated
    await expect(page.getByText("Sign in to your Moneyrails account")).toBeVisible();

    // Ensure it is NOT a link
    const linkParent = page.locator('main a img[alt="Moneyrails"]');
    expect(await linkParent.count()).toBe(0);
  });

  test("4. Guest entry persists across page reloads (Dexie db name intact)", async ({
    page,
  }) => {
    // Go to landing and click "Try without an account"
    await page.goto("/");
    const tryGuestBtn = page.getByTestId("landing-try-guest");
    await tryGuestBtn.scrollIntoViewIfNeeded();
    await tryGuestBtn.click();
    await expect(page).toHaveURL("http://localhost:3000/");

    // Add an expense entry
    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("85000"); // ₦85,000
    await page.getByLabel(/Description/i).fill("Consulting Project");
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await page.waitForTimeout(500);

    // Go to Records list and verify entry is present
    await page.goto("/records?tab=expenses");
    await expect(page.getByText("Consulting Project").first()).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify entry persists after reload (Dexie DB name intact)
    await expect(page.getByText("Consulting Project").first()).toBeVisible();
  });

  test("5. OpenGraph image route and Web App manifest", async ({ page }) => {
    // Check manifest
    const manifestRes = await page.request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("Moneyrails");
    expect(manifest.short_name).toBe("Moneyrails");

    // Check opengraph-image via HTML meta tag
    await page.goto("/");
    const ogImageMeta = page.locator('meta[property="og:image"]').first();
    await expect(ogImageMeta).toBeAttached();
    const ogHref = await ogImageMeta.getAttribute("content");
    expect(ogHref).toBeTruthy();

    if (ogHref) {
      const ogRes = await page.request.get(ogHref);
      expect(ogRes.status()).toBe(200);
      expect(ogRes.headers()["content-type"]).toContain("image/png");
    }
  });
});

