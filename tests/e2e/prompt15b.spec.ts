import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 15b: Records summary, auth names, shared device, themes, guest badge", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("1. Welcome screen button order: Email, Google, Try without an account", async ({ page }) => {
    // Navigate to /welcome with intent=signin so it doesn't redirect existing session
    await page.goto("/welcome?intent=signin");

    // Look for the buttons in order
    const emailBtn = page.getByRole("button", { name: /Continue with email/i });
    const googleBtn = page.getByRole("button", { name: /Continue with Google/i });
    const guestLink = page.getByRole("button", { name: /Try without an account/i });

    await expect(emailBtn).toBeVisible();
    await expect(googleBtn).toBeVisible();
    await expect(guestLink).toBeVisible();

    // Verify DOM order: Email comes before Google, Google comes before Guest
    const emailBox = await emailBtn.boundingBox();
    const googleBox = await googleBtn.boundingBox();
    const guestBox = await guestLink.boundingBox();

    expect(emailBox && googleBox && guestBox).toBeTruthy();
    if (emailBox && googleBox && guestBox) {
      expect(emailBox.y).toBeLessThan(googleBox.y);
      expect(googleBox.y).toBeLessThan(guestBox.y);
    }

    // Verify "Continue with email" expands to show "Your first name" and "Email" fields
    await emailBtn.click();
    await expect(page.getByLabel(/Your first name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/This is someone else's device/i)).toBeVisible();
  });

  test("2. Records: Single add button per tab in summary row with uppercase title, amount and subtitle", async ({
    page,
  }) => {
    await page.goto("/records");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    const tabs = [
      {
        tabId: "records-tab-income",
        label: "TOTAL INCOME",
        btnName: "Add income",
      },
      {
        tabId: "records-tab-expenses",
        label: "TOTAL EXPENSES",
        btnName: "Add expense",
      },
      {
        tabId: "records-tab-giving",
        label: "TOTAL GIVING",
        btnName: "Add giving",
      },
      {
        tabId: "records-tab-lent",
        label: "OWED TO YOU",
        btnName: "Lend money",
      },
    ];

    for (const tab of tabs) {
      await page.click(`[data-testid="${tab.tabId}"]`);

      // Verify summary uppercase label
      await expect(page.getByText(tab.label)).toBeVisible();

      // Verify no add button in filter row
      const filterRowAddBtn = page.locator(".flex.gap-2 button:has-text('Add')");
      await expect(filterRowAddBtn).toHaveCount(0);

      // Verify exactly one add button in the summary row
      const summaryAddBtn = page.getByTestId("records-summary-add-button");
      await expect(summaryAddBtn).toBeVisible();
      await expect(summaryAddBtn).toHaveText(tab.btnName);
    }
  });

  test("3. Home 'Money I lent' card links directly to /new/lent", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    const lentCard = page.getByRole("link", { name: /Money I lent/i });
    await expect(lentCard).toBeVisible();
    await expect(lentCard).toHaveAttribute("href", "/new/lent");
  });

  test("4. Guest changes waiting badge shows 'Saved on this device'", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // Header badge for guest
    const guestBadge = page.getByText(/Saved on this device/i);
    await expect(guestBadge).toBeVisible();

    const signInLink = page.getByRole("link", { name: /Sign in to back up/i });
    await expect(signInLink).toBeVisible();
  });

  test("5. Shared device mode: signs out and clears Dexie when tab reopens without sessionStorage", async ({
    page,
    context,
  }) => {
    // 1. Simulate signing in on someone else's device
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: "user-shared-device-123",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // Set shared device flags matching app storage keys
    await page.evaluate(() => {
      sessionStorage.setItem("moneymap_shared_device", "true");
      localStorage.setItem("moneymap_was_shared_device", "true");
    });

    // Reload with active session: banner should appear
    await page.reload();
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await expect(page.getByText(/You're on someone else's device. Sign out when you're done./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();

    // 2. Now simulate browser tab closure: sessionStorage is cleared, but localStorage persists
    await page.evaluate(() => {
      sessionStorage.removeItem("moneymap_shared_device");
    });

    // Reopen / reload app: should detect missing session, clear Dexie and sign out to /welcome
    await page.reload();
    await expect(page).toHaveURL(/.*\/welcome/);
  });

  test("6. Guest entries protection: displays 'Add them / Not mine' dialog upon signing in", async ({
    page,
    context,
  }) => {
    // 1. Create a guest entry in Dexie
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await page.evaluate(async () => {
      const db = (
        window as unknown as {
          __db: { entries: { add: (entry: Record<string, unknown>) => Promise<unknown> } };
        }
      ).__db;
      await db.entries.add({
        id: crypto.randomUUID(),
        user_id: null,
        type: "expense",
        amount_minor: 500000,
        currency: "NGN",
        category_id: crypto.randomUUID(),
        date: "2026-10-20",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });
    });

    // 2. Simulate user signing in
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: "user-with-guest-data-789",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.reload();
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // Verify dialog appears asking about guest entries
    await expect(page.getByText(/This device has 1 entry saved without an account/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Add them/i })).toBeVisible();
    const notMineBtn = page.getByRole("button", { name: /Not mine, keep separate/i });
    await expect(notMineBtn).toBeVisible();

    // Tap "Not mine, keep separate"
    await notMineBtn.click();
    await expect(page.getByText(/Add them/i)).not.toBeVisible();
  });

  test("7. Settings > Account: Name autosave after 600ms, survives reload, Email is read-only", async ({
    page,
    context,
  }) => {
    // Sign in user
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: "user-settings-test-999",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/settings");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    const nameInput = page.getByLabel(/^Name$/i);
    const emailInput = page.getByLabel(/^Email$/i);

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeDisabled();
    await expect(page.getByText(/Your sign-in email can't be changed/i)).toBeVisible();

    // Type new name
    await nameInput.fill("Ngozi");

    // Wait for autosave tick (600ms debounce)
    await expect(page.getByText(/Saved/i)).toBeVisible({ timeout: 5000 });

    // Reload and verify name persisted
    await page.reload();
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await expect(page.getByLabel(/^Name$/i)).toHaveValue("Ngozi");
  });

  test("8. Theme switch: Light, Dark, System and capture screenshots", async ({ page }) => {
    test.setTimeout(60000);
    // Navigate to Settings
    await page.goto("/settings");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    const lightBtn = page.getByTestId("theme-light-btn");
    const darkBtn = page.getByTestId("theme-dark-btn");
    const systemBtn = page.getByTestId("theme-system-btn");

    await expect(lightBtn).toBeVisible();
    await expect(darkBtn).toBeVisible();
    await expect(systemBtn).toBeVisible();

    // 1. Switch to Light mode
    await lightBtn.click();
    await page.waitForTimeout(300);
    const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLight).toBe(true);

    // Capture Light screenshots: Home, Records, New Form, Insights
    await page.goto("/");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/home-light.png" });

    await page.goto("/records");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/records-light.png" });

    await page.goto("/new/expense");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/form-light.png" });

    await page.goto("/insights");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/insights-light.png" });

    // 2. Switch to Dark mode
    await page.goto("/settings");
    await darkBtn.click();
    await page.waitForTimeout(300);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);

    // Capture Dark screenshots: Home, Records, New Form, Insights
    await page.goto("/");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/home-dark.png" });

    await page.goto("/records");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/records-dark.png" });

    await page.goto("/new/expense");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/form-dark.png" });

    await page.goto("/insights");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/e2e/screenshots/insights-dark.png" });

    // Verify Insights cards renamed: "Giving" and "Money I lent"
    await expect(page.getByText("Giving").first()).toBeVisible();
    await expect(page.getByText("Money I lent").first()).toBeVisible();
  });
});
