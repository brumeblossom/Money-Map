import { expect, test } from "@playwright/test";

test.describe("Session Detection & Back-to-Landing Navigation (Prompt 21d)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Code-verifier cookie alone renders landing page at '/', never broken Home", async ({
    page,
    context,
  }) => {
    // Set ONLY the Supabase PKCE code-verifier cookie
    await context.addCookies([
      {
        name: "sb-jiktrplyuneakhhoayde-auth-token-code-verifier",
        value: "dummy-pkce-code-verifier-string-999",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");

    // Verify landing page elements are visible
    const landingLogo = page.getByTestId("landing-logo");
    await expect(landingLogo).toBeVisible();
    await expect(page).toHaveTitle(/Moneyrails/);
    await expect(
      page.getByRole("heading", { name: "What you need to know about Moneyrails" })
    ).toBeVisible();

    // Verify Home dashboard elements are NOT present
    await expect(page.getByText("Welcome, guest")).toHaveCount(0);
    await expect(page.getByTestId("header-sync-badge")).toHaveCount(0);
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.getByTestId("app-bottom-nav")).toHaveCount(0);
  });

  test("2. Landing -> /welcome -> Back returns to landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-logo")).toBeVisible();

    // Click Sign in to navigate to /welcome
    const signInBtn = page.getByTestId("landing-signin-hero");
    await signInBtn.scrollIntoViewIfNeeded();
    await signInBtn.click();

    // Arrive on /welcome
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    // Press browser Back button
    await page.goBack();

    // Verify user is back on the landing page
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What you need to know about Moneyrails" })
    ).toBeVisible();
    await expect(page.getByText("Welcome, guest")).toHaveCount(0);
  });

  test("3. Landing -> /welcome -> Try without an account -> guest Home -> Back = landing, then Try without an account again = guest Home with entry preserved", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing-logo")).toBeVisible();

    // 1. Landing -> /welcome?mode=signup
    const getStartedBtn = page.getByTestId("landing-get-started-hero");
    await getStartedBtn.scrollIntoViewIfNeeded();
    await getStartedBtn.click();
    await expect(page).toHaveURL(/\/welcome\?mode=signup/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    // 2. Click Try without an account
    const tryGuestBtn = page.getByTestId("welcome-try-guest");
    await tryGuestBtn.click();

    // 3. Arrive on guest Home
    await expect(page.getByText("Welcome, guest")).toBeVisible({ timeout: 10000 });

    // 4. Press browser Back button
    await page.goBack();

    // 5. Verify landing page is displayed (not /welcome, not reload of Home)
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What you need to know about Moneyrails" })
    ).toBeVisible();
    await expect(page.getByText("Welcome, guest")).toHaveCount(0);

    // 6. Click "Try without an account" on landing to re-enter guest Home
    const tryGuestAgain = page.getByTestId("landing-try-guest");
    await tryGuestAgain.scrollIntoViewIfNeeded();
    await tryGuestAgain.click();
    await expect(page.getByText("Welcome, guest")).toBeVisible({ timeout: 10000 });

    // 7. Add an expense entry
    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("15000"); // ₦15,000
    await page.getByLabel(/Description/i).fill("Fresh Groceries");
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await page.waitForTimeout(500);

    // 8. Go to Records list and verify entry is present
    await page.goto("/records?tab=expenses");
    await expect(page.getByText("Fresh Groceries").first()).toBeVisible();

    // 9. Re-visit landing and click "Try without an account" again to verify entry is preserved
    await page.goto("/?view=landing");
    await expect(page.getByTestId("landing-logo")).toBeVisible();
    await page.getByTestId("landing-try-guest").click();
    await expect(page.getByText("Welcome, guest")).toBeVisible({ timeout: 10000 });
    await page.goto("/records?tab=expenses");
    await expect(page.getByText("Fresh Groceries").first()).toBeVisible();
  });

  test("4. 'Welcome, guest' Home never renders without the app chrome", async ({
    page,
    context,
  }) => {
    // Set guest cookies
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "mm_guest", value: "1", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await expect(page.getByText("Welcome, guest")).toBeVisible({ timeout: 10000 });

    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isDesktop) {
      // Desktop: sidebar MUST be visible
      const sidebar = page.locator("aside");
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('img[alt="Moneyrails"]')).toBeVisible();
    } else {
      // Mobile: bottom nav and top header MUST be visible
      const bottomNav = page.getByTestId("app-bottom-nav");
      await expect(bottomNav).toBeVisible();
      const header = page.locator("header");
      await expect(header).toBeVisible();
      await expect(page.getByTestId("header-sync-badge")).toBeVisible();
    }
  });
});
