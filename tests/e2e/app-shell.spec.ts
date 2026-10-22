import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { setGuestCookie } from "./test-helpers";

const PRD_ROUTES = [
  { path: "/", title: "Home" },
  { path: "/welcome?intent=signin", title: "Money Map" },
  { path: "/auth/check-email", title: "Check your email" },
  { path: "/auth/callback", title: "Signing you in..." },
  { path: "/new/income", title: "Entry form" },
  { path: "/new/expense", title: "Entry form" },
  { path: "/new/giving", title: "Entry form" },
  { path: "/new/lent", title: "Entry form" },
  { path: "/records", title: "Records" },
  { path: "/records/sample-id", title: "Entry detail" },
  { path: "/records/sample-id/edit", title: "Edit entry" },
  { path: "/lent", title: "Records" },
  { path: "/lent/sample-id", title: "Loan detail" },
  { path: "/insights", title: "Dashboard" },
  { path: "/insights/habits", title: "Habits" },
  { path: "/insights/habits/food-dining", title: "Category report" },
  { path: "/export", title: "Export" },
  { path: "/settings", title: "Settings" },
  { path: "/s/sample-share-token", title: "Shared report" },
];

test.describe("App Shell & Responsive Navigation", () => {
  test.beforeAll(async () => {
    const screenshotsDir = path.join(process.cwd(), "tests/e2e/screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("responsive visibility and screenshot capture", async ({ page, isMobile }, testInfo) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    const bottomNav = page.getByTestId("app-bottom-nav");
    const sidebar = page.getByTestId("app-sidebar");

    if (isMobile) {
      // 390px phone project
      await expect(bottomNav).toBeVisible();
      await expect(sidebar).toBeHidden();

      const screenshotPath = path.join(
        process.cwd(),
        "tests/e2e/screenshots/home-phone-390.png",
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testInfo.attach("phone-screenshot", { path: screenshotPath });
    } else {
      // 1280px desktop project
      await expect(sidebar).toBeVisible();
      await expect(bottomNav).toBeHidden();

      const screenshotPath = path.join(
        process.cwd(),
        "tests/e2e/screenshots/home-desktop-1280.png",
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testInfo.attach("desktop-screenshot", { path: screenshotPath });
    }
  });

  test("no horizontal scrollbar at 360px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  for (const route of PRD_ROUTES) {
    test(`route ${route.path} loads without error and displays title`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBeLessThan(400);

      // Verify page title or label is present in the DOM
      if (route.path.startsWith("/auth/callback")) {
        await expect(page.getByText(route.title).first()).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: route.title }).first(),
        ).toBeVisible();
      }
    });
  }
});
