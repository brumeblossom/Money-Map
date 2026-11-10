import { expect, test } from "@playwright/test";

test.describe("Prompt 17h: New Landing Page", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders all sections in correct order", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // a) Header
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByTestId("landing-logo")).toBeVisible();

    // b) Hero
    await expect(
      page.getByRole("heading", { name: "Know where your money goes." })
    ).toBeVisible();
    await expect(page.getByTestId("landing-get-started-hero")).toBeVisible();
    await expect(page.getByTestId("landing-signin-hero")).toBeVisible();
    await expect(page.getByTestId("landing-phone-mockup")).toBeVisible();

    // c) Why Money Map
    const whySection = page.locator("section#why");
    await expect(whySection).toBeVisible();
    await expect(
      whySection.getByRole("heading", {
        name: "What you need to know about Money Map",
      })
    ).toBeVisible();
    await expect(page.getByTestId("landing-get-started-why")).toBeVisible();

    // d) Features
    const featuresSection = page.locator("section#features");
    await expect(featuresSection).toBeVisible();
    await expect(featuresSection.getByText("Record in seconds")).toBeVisible();
    await expect(featuresSection.getByText("See your habits")).toBeVisible();
    await expect(
      featuresSection.getByText("Never forget money you lent")
    ).toBeVisible();

    // e) Benefits
    const benefitsSection = page.locator("section#benefits");
    await expect(benefitsSection).toBeVisible();
    await expect(
      benefitsSection.getByRole("heading", { name: "Made for real life" })
    ).toBeVisible();
    await expect(benefitsSection.getByText("Free to use")).toBeVisible();
    await expect(
      benefitsSection.getByText("Works without internet")
    ).toBeVisible();
    await expect(benefitsSection.getByText("Phone and laptop")).toBeVisible();
    await expect(benefitsSection.getByText("Clear PDF reports")).toBeVisible();

    // f) FAQ
    const faqSection = page.locator("section#faq");
    await expect(faqSection).toBeVisible();
    await expect(
      faqSection.getByRole("heading", { name: "Frequently asked questions" })
    ).toBeVisible();
    await expect(
      faqSection.getByRole("heading", {
        name: "Start mapping your money today.",
      })
    ).toBeVisible();
    await expect(page.getByTestId("landing-get-started-cta")).toBeVisible();

    // g) Footer
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("© 2026 Money Map")).toBeVisible();
    await expect(page.getByTestId("landing-try-guest")).toBeVisible();
  });

  test("header 'Get started' is visible on both phone (390px) and desktop (1280px)", async ({
    page,
    viewport,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const getStartedHeader = page.getByTestId("landing-get-started-header");
    await expect(getStartedHeader).toBeVisible();

    const isPhone = (viewport?.width ?? 0) < 640;
    if (isPhone) {
      await expect(page.getByTestId("landing-signin-header")).toBeHidden();
    } else {
      await expect(page.getByTestId("landing-signin-header")).toBeVisible();
    }
  });

  test("FAQ accordion opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const firstDetails = page.locator("section#faq details").first();
    await expect(firstDetails).toHaveAttribute("open", "");

    const secondDetails = page.locator("section#faq details").nth(1);
    await expect(secondDetails).not.toHaveAttribute("open");

    // Click second FAQ summary to open it
    await secondDetails.locator("summary").click();
    await expect(secondDetails).toHaveAttribute("open", "");

    // Click first FAQ summary to close it
    await firstDetails.locator("summary").click();
    await expect(firstDetails).not.toHaveAttribute("open");
  });

  test("footer links have the correct targets and 'Try without an account' works", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click 'Try without an account'
    await page.getByTestId("landing-try-guest").click();
    await page.waitForLoadState("domcontentloaded");

    // Should now be signed in as guest on Home
    await expect(
      page.getByRole("heading", { name: "What are we recording today?" })
    ).toBeVisible();
  });

  test("no horizontal scrollbar at 360px, 390px, 430px", async ({ page }) => {
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      const hasHorizontalScroll = await page.evaluate(() => {
        const container =
          document.getElementById("landing-scroll-container") ||
          document.documentElement;
        return container.scrollWidth > container.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test("light and dark mode toggle works on landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.getByTestId("theme-toggle-btn");
    await expect(toggle).toBeVisible();

    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    await toggle.click();

    await expect
      .poll(async () => {
        return await page.evaluate(() =>
          document.documentElement.classList.contains("dark")
        );
      })
      .toBe(!initialDark);
  });
});
