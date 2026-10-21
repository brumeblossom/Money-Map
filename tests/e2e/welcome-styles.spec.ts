import { test, expect } from "@playwright/test";

test.describe("Welcome Page Styles & Static Assets", () => {
  test("loads /welcome signed out and proves CSS is loaded and applied", async ({ page, context }) => {
    // Ensure context has no cookies (signed out)
    await context.clearCookies();

    // Track static CSS requests
    const cssResponses: { url: string; status: number }[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/_next/static/css/") || url.endsWith(".css")) {
        cssResponses.push({ url, status: res.status() });
      }
    });

    await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Verify at least one CSS file was loaded with 200 OK
    expect(cssResponses.length).toBeGreaterThan(0);
    expect(cssResponses.every((r) => r.status === 200)).toBe(true);

    // Verify "Continue with Google" button is visible
    const googleButton = page.getByTestId("welcome-google");
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText("Continue with Google");

    // Check computed styles on "Continue with Google" button
    const styles = await googleButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        display: computed.display,
      };
    });

    // Proves CSS loaded: background colour is defined and NOT transparent
    expect(styles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(styles.backgroundColor).not.toBe("transparent");
    expect(styles.backgroundColor).toBeTruthy();

    // Proves Tailwind theme custom radius-xl (0.625rem * 1.4 = 14px) and flex layout were applied
    expect(styles.borderRadius).toBe("14px");
    expect(styles.display).toBe("flex");
  });
});
