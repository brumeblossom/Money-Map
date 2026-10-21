import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Offline App Shell & PWA (Prompt 11)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("manifest and meta tags satisfy PWA installability requirements", async ({ page }) => {
    await page.goto("/");

    // 1. Check link rel="manifest"
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");

    // 2. Fetch and validate manifest content
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();

    expect(manifest.name).toBe("Money Map");
    expect(manifest.short_name).toBe("Money Map");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color).toBe("#059669");
    expect(manifest.background_color).toBe("#ffffff");

    // Verify 192px and 512px maskable and any icons
    const icons = manifest.icons as { src: string; sizes: string; purpose?: string }[];
    expect(icons.length).toBeGreaterThanOrEqual(4);
    expect(icons.some((i) => i.sizes === "192x192" && i.purpose === "maskable")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
    expect(icons.some((i) => i.sizes === "192x192" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);

    // Verify apple-touch-icon
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute("href", "/icons/apple-touch-icon.png");

    // Verify Apple meta tags
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]').first();
    await expect(appleCapable).toHaveAttribute("content", "yes");

    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]').first();
    await expect(appleTitle).toHaveAttribute("content", "Money Map");
  });

  test("Settings > Add to Home Screen shows help without intrusive popups", async ({ page }) => {
    await page.goto("/settings");
    const pwaCard = page.getByTestId("pwa-install-card");
    await expect(pwaCard).toBeVisible();
    await expect(pwaCard).toContainText("Add to Home Screen");

    // No unsolicited banner/modal on home or settings
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test("Settings shows iOS Share instructions on iPhone User-Agent", async ({ browser }) => {
    const iphoneContext = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
    });
    await setGuestCookie(iphoneContext);
    const page = await iphoneContext.newPage();
    await page.goto("/settings");

    const iosSteps = page.getByTestId("ios-install-steps");
    await expect(iosSteps).toBeVisible();
    await expect(iosSteps).toContainText("Share");
    await expect(iosSteps).toContainText("Add to Home Screen");

    await iphoneContext.close();
  });

  test("offline navigation and form saving works when network drops", async ({
    page,
    context,
  }) => {
    // 1. Visit pages while online so they are cached by browser / service worker
    await page.goto("/");
    await expect(page.getByText("Money Map").first()).toBeVisible();

    // Ensure service worker is registered and controlling the page
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker?.ready;
      return Boolean(reg?.active);
    }, { timeout: 15_000 });

    await page.goto("/records");
    await expect(page.getByText("Records").first()).toBeVisible();

    await page.goto("/insights");
    await expect(page.getByText("Dashboard").first()).toBeVisible();

    await page.goto("/new/income");
    await expect(page.getByPlaceholder("0.00").first()).toBeVisible();

    // Give service worker a moment to complete runtime cache put
    await page.waitForTimeout(500);

    // 2. Go offline
    await context.setOffline(true);

    // 3. Reload Home offline
    await page.goto("/");
    await expect(page.getByText("Money Map").first()).toBeVisible();

    // 4. Open form offline and save an entry
    await page.goto("/new/income");
    const amountInput = page.getByPlaceholder("0.00").first();
    await expect(amountInput).toBeVisible();
    await amountInput.fill("12500"); // ₦12,500.00

    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify toast "Saved" appears and outbox records change
    await expect(page.getByText("Saved")).toBeVisible();

    // 5. Navigate to Records offline
    await page.goto("/records");
    await expect(page.getByText("Records").first()).toBeVisible();

    // 6. Navigate to Insights offline
    await page.goto("/insights");
    await expect(page.getByText("Dashboard").first()).toBeVisible();

    // 7. Verify /offline fallback page loads for uncached states
    await page.goto("/offline");
    await expect(page.getByText("You're offline")).toBeVisible();
    await expect(
      page.getByText("Your entries are saved on this device and will sync when you're back online."),
    ).toBeVisible();
  });
});
