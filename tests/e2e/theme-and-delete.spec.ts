import { test, expect } from "@playwright/test";
import { setTestAuthCookie } from "./test-helpers";

test.describe("Part A: Light / Dark Theme Switch", () => {
  test("switch appears on landing page, header adapts for phone vs desktop", async ({
    page,
    viewport,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Theme switch must be present in header
    const toggle = page.getByTestId("theme-toggle-btn");
    await expect(toggle).toBeVisible();

    const isPhone = (viewport?.width ?? 0) < 640;
    const getStartedHeader = page.getByTestId("landing-get-started-header");

    // Get started is present on both phone and desktop (Prompt 17h)
    await expect(getStartedHeader).toBeVisible();
    await expect(page.getByTestId("landing-logo")).toBeVisible();

    if (isPhone) {
      // On phones: Sign in is hidden from header
      await expect(page.getByTestId("landing-signin-header")).toBeHidden();
    } else {
      // On desktop: switch, Sign in, Get started
      await expect(page.getByTestId("landing-signin-header")).toBeVisible();
    }
  });

  test("switch appears on sign-in page in top right outside card", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.getByTestId("theme-toggle-btn");
    await expect(toggle).toBeVisible();
  });

  test("switch appears on in-app pages in AppHeader", async ({ page, context }) => {
    await setTestAuthCookie(context);

    const routes = ["/", "/records", "/lent", "/insights", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const toggle = page.locator("header").getByTestId("theme-toggle-btn");
      await expect(toggle).toBeVisible();
    }
  });

  test("tapping switch changes theme, survives reload, and updates Settings > Appearance", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.locator("header").getByTestId("theme-toggle-btn");
    await expect(toggle).toBeVisible();

    // Read initial theme state
    const initialIsDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );

    // Tap toggle
    await toggle.click();

    // Verify theme changed
    await expect
      .poll(async () => {
        return await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        );
      })
      .toBe(!initialIsDark);

    // Reload page and verify theme choice survived
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const reloadedIsDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(reloadedIsDark).toBe(!initialIsDark);

    // Go to Settings and verify Appearance choice matches immediately
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("header").getByTestId("theme-toggle-btn")).toBeVisible({
      timeout: 15_000,
    });

    if (!initialIsDark) {
      // Switched to dark
      await expect(page.getByTestId("theme-dark-btn")).toHaveClass(/bg-card/, {
        timeout: 15_000,
      });
    } else {
      // Switched to light
      await expect(page.getByTestId("theme-light-btn")).toHaveClass(/bg-card/, {
        timeout: 15_000,
      });
    }

    // Changing choice in Settings updates the header icon
    const targetBtn = !initialIsDark
      ? page.getByTestId("theme-light-btn")
      : page.getByTestId("theme-dark-btn");
    await targetBtn.click();

    await expect
      .poll(async () => {
        return await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        );
      })
      .toBe(initialIsDark);
  });
});

test.describe("Part B: Delete Account Fix (Mocked API)", () => {
  test("success: lands on '/' showing 'Your account has been deleted.' and clean URL", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);

    // Mock delete endpoint
    await page.route("**/api/account/delete", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Open delete account modal
    await page.getByTestId("settings-delete-account-btn").click();

    // Type DELETE
    const confirmInput = page.getByTestId("delete-confirm-input");
    await expect(confirmInput).toBeVisible();
    await confirmInput.fill("DELETE");

    // Click confirm
    const confirmBtn = page.getByTestId("confirm-delete-account-btn");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify redirect to landing page '/'
    await page.waitForURL((url) => url.pathname === "/");

    // Verify success toast appears
    await expect(page.getByText("Your account has been deleted.")).toBeVisible();

    // Verify clean address bar without ?deleted=1
    await expect
      .poll(() => page.url())
      .toMatch(/^https?:\/\/[^/]+\/?$/);
  });

  test("500 failure: shows error toast and stops spinning, modal remains open", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);

    await page.route("**/api/account/delete", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "server_error" }),
      });
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("settings-delete-account-btn").click();
    await page.getByTestId("delete-confirm-input").fill("DELETE");
    await page.getByTestId("confirm-delete-account-btn").click();

    // Toast error
    await expect(
      page.getByText("Couldn't delete your account. Please try again."),
    ).toBeVisible();

    // Modal stays open and button stops spinning (is enabled)
    await expect(page.getByTestId("delete-confirm-input")).toBeVisible();
    await expect(page.getByTestId("confirm-delete-account-btn")).toBeEnabled();
  });

  test("timeout: shows time-out toast after 20 seconds, button stops spinning, modal remains open", async ({
    page,
    context,
  }) => {
    test.setTimeout(40_000);
    await setTestAuthCookie(context);

    // Mock endpoint that hangs indefinitely (until client aborts)
    await page.route("**/api/account/delete", async () => {
      // Do nothing, simulating dropped/hanging connection
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("settings-delete-account-btn").click();
    await page.getByTestId("delete-confirm-input").fill("DELETE");
    await page.getByTestId("confirm-delete-account-btn").click();

    // Button spins while waiting
    await expect(page.getByText("Deleting account...")).toBeVisible();

    // After 20 seconds, AbortController aborts and toast is displayed
    await expect(
      page.getByText("This is taking too long. Check your connection and try again."),
    ).toBeVisible({ timeout: 26_000 });

    // Modal stays open and confirm button stops spinning
    await expect(page.getByTestId("delete-confirm-input")).toBeVisible();
    await expect(page.getByTestId("confirm-delete-account-btn")).toBeEnabled();
  });
});

