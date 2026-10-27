import { expect, test } from "@playwright/test";

test.describe("Prompt 17b: Landing Page & Redesigned Auth Flow", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("signed-out visit to '/' shows the landing page with 4 parts", async ({ page }) => {
    await page.goto("/");

    // URL remains "/"
    await expect(page).toHaveURL("http://localhost:3000/");

    // Part 1: Header logo and buttons
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await expect(page.getByTestId("landing-get-started-header")).toBeVisible();

    // Part 2: Hero headline, subtext, CTA buttons, and phone mockup
    await expect(
      page.getByRole("heading", { name: "Know where your money goes." })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Record your income, expenses, giving and money you've lent in seconds. See clear monthly totals and spending habits on your phone or laptop."
      )
    ).toBeVisible();
    await expect(page.getByTestId("landing-get-started-hero")).toBeVisible();
    await expect(page.getByTestId("landing-signin-hero")).toBeVisible();
    await expect(page.getByTestId("landing-phone-mockup")).toBeVisible();

    // Part 3: Three feature blocks
    await expect(page.getByText("Record in seconds")).toBeVisible();
    await expect(
      page.getByText("Tap a card, type the amount, done. Works even without internet.")
    ).toBeVisible();
    await expect(page.getByText("See your habits")).toBeVisible();
    await expect(
      page.getByText("Monthly totals, charts and category reports show where it all goes.")
    ).toBeVisible();
    await expect(page.getByText("Never forget money you lent")).toBeVisible();
    await expect(
      page.getByText("Track who owes you, how much is left and when it's due.")
    ).toBeVisible();

    // Part 4: CTA band & Footer
    await expect(
      page.getByRole("heading", { name: "Start mapping your money today." })
    ).toBeVisible();
    await expect(page.getByTestId("landing-get-started-cta")).toBeVisible();
    await expect(page.getByText("© 2026 Money Map")).toBeVisible();
    const feedbackLink = page.getByRole("link", { name: "Send feedback" });
    await expect(feedbackLink).toBeVisible();
    await expect(feedbackLink).toHaveAttribute("href", "mailto:workwithbrume@gmail.com");
  });

  test("signed-in visit to '/' shows the app Home (no landing page flash)", async ({
    page,
    context,
  }) => {
    // Set guest cookie to simulate signed-in / guest session
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");

    // Directly shows app Home
    await expect(
      page.getByRole("heading", { name: "What are we recording today?" })
    ).toBeVisible();
    // Landing page hero is NOT present
    await expect(
      page.getByRole("heading", { name: "Know where your money goes." })
    ).toHaveCount(0);
  });

  test("Get started opens sign-up mode at /welcome?mode=signup", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("landing-get-started-hero").click();

    await expect(page).toHaveURL(/\/welcome\?mode=signup/);
    await expect(
      page.getByRole("heading", { name: "Create your account" })
    ).toBeVisible();
    await expect(page.getByTestId("welcome-first-name-input")).toBeVisible();
    await expect(page.getByTestId("welcome-email-input")).toBeVisible();
    await expect(page.getByTestId("welcome-signup-submit")).toBeVisible();
    await expect(page.getByTestId("welcome-google")).toBeVisible();
    await expect(page.getByTestId("welcome-try-guest")).toBeVisible();
  });

  test("Sign in opens /welcome with Back link and Back button returning to landing page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("landing-signin-hero").click();

    await expect(page).toHaveURL("http://localhost:3000/welcome");
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();

    // Verify "Back to home" link above the card
    const backToHome = page.getByTestId("welcome-back-home");
    await expect(backToHome).toBeVisible();

    // Browser / Phone Back returns to landing page
    await page.goBack();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "Know where your money goes." })
    ).toBeVisible();
  });

  test("Phone viewport (390px) verifies responsive landing page and header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Mobile header has logo + Get started only; Sign in is in hero
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await expect(page.getByTestId("landing-get-started-header")).toBeVisible();
    await expect(page.getByTestId("landing-signin-header")).toBeHidden();
    await expect(page.getByTestId("landing-signin-hero")).toBeVisible();

    // Hero buttons & mockup
    await expect(page.getByTestId("landing-get-started-hero")).toBeVisible();
    await expect(page.getByTestId("landing-phone-mockup")).toBeVisible();

    // 3 feature blocks stacked
    await expect(page.getByText("Record in seconds")).toBeVisible();
    await expect(page.getByText("See your habits")).toBeVisible();
    await expect(page.getByText("Never forget money you lent")).toBeVisible();

    // Final CTA band & footer
    await expect(
      page.getByRole("heading", { name: "Start mapping your money today." })
    ).toBeVisible();
    await expect(page.getByText("© 2026 Money Map")).toBeVisible();
  });

  test("Desktop viewport (1280px) verifies desktop landing page layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Desktop header has logo + Sign in + Get started
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await expect(page.getByTestId("landing-signin-header")).toBeVisible();
    await expect(page.getByTestId("landing-get-started-header")).toBeVisible();

    // Phone mockup beside hero
    await expect(page.getByTestId("landing-phone-mockup")).toBeVisible();

    // CTA band
    await expect(
      page.getByRole("heading", { name: "Start mapping your money today." })
    ).toBeVisible();
  });
});
