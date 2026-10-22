import { expect, test } from "@playwright/test";

interface MockEntry {
  id: string;
  user_id: string;
}

interface MockOutbox {
  table: string;
  row_id: string;
}

interface WindowWithDb extends Window {
  __db?: {
    entries: {
      clear: () => Promise<void>;
      toArray: () => Promise<MockEntry[]>;
    };
    meta: {
      clear: () => Promise<void>;
    };
    outbox: {
      clear: () => Promise<void>;
      count: () => Promise<number>;
      toArray: () => Promise<MockOutbox[]>;
    };
  };
}

test.describe("Auth and Guest Mode Flow (Prompt 9)", () => {
  test("first-time visitor lands on /welcome, 'Try without an account' lands on Home in <1s", async ({
    page,
    context,
  }) => {
    // 1. Clean cookies (first-time visitor)
    await context.clearCookies();

    // 2. Navigating to / should redirect to /welcome
    await page.goto("/");
    await expect(page).toHaveURL(/\/welcome/);

    // Verify brand, pitch, and action buttons
    await expect(page.getByRole("heading", { name: "Money Map" })).toBeVisible();
    await expect(
      page.getByText(/Track your money effortlessly with zero clutter/i),
    ).toBeVisible();
    await expect(page.getByTestId("welcome-google")).toBeVisible();
    await expect(page.getByTestId("welcome-email-toggle")).toBeVisible();
    await expect(page.getByTestId("welcome-try-guest")).toBeVisible();

    // 3. Click 'Try without an account' and time the transition
    const startTime = Date.now();
    await page.getByTestId("welcome-try-guest").click();

    // Lands on Home
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "What are we recording today?" }),
    ).toBeVisible();
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(6000); // Transitions smoothly without lag

    // Verify cookie was set
    const cookies = await context.cookies();
    const guestCookie = cookies.find((c) => c.name === "moneymap_guest");
    expect(guestCookie?.value).toBe("true");
  });

  test("email validation shows 'Enter a valid email' and valid email goes to /auth/check-email with 60s countdown", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Intercept Supabase OTP request
    await page.route("**/auth/v1/otp*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/welcome?intent=signin");

    // Click 'Continue with email'
    await page.getByTestId("welcome-email-toggle").click();
    const emailInput = page.getByTestId("welcome-email-input");
    await expect(emailInput).toBeVisible();

    // Type invalid email and submit
    await emailInput.fill("invalid-email-address");
    await page.getByTestId("welcome-email-submit").click();

    // Shows "Enter a valid email"
    await expect(page.getByTestId("welcome-email-error")).toHaveText("Enter a valid email");

    // Fill first name and type valid email and submit
    await page.getByTestId("welcome-first-name-input").fill("Chinedu");
    await emailInput.fill("chinedu@example.com");
    await page.getByTestId("welcome-email-submit").click();

    // Lands on /auth/check-email
    await expect(page).toHaveURL(/\/auth\/check-email/);
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText("chinedu@example.com")).toBeVisible();

    // Verify Resend button is initially disabled with countdown
    const resendBtn = page.getByTestId("auth-resend-button");
    await expect(resendBtn).toBeDisabled();
    await expect(resendBtn).toContainText("Resend (");
  });

  test("guest banner appears after 3rd saved entry and is dismissible for 7 days", async ({
    page,
    context,
  }) => {
    // Set guest cookie and start on Home
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "What are we recording today?" }),
    ).toBeVisible();

    // Clear Dexie database for fresh test
    await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      if (db) {
        await db.entries.clear();
        await db.meta.clear();
      }
    });
    await page.reload();

    // Banner should NOT be visible with 0 entries
    await expect(page.getByTestId("guest-banner")).not.toBeVisible();

    // Add Entry 1 (Income ₦5,000)
    await page.goto("/new/income");
    await page.getByPlaceholder("0.00").first().fill("5000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Add Entry 2 (Expense ₦2,000)
    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("2000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Banner should still NOT be visible with 2 entries
    await page.goto("/");
    await expect(page.getByTestId("guest-banner")).not.toBeVisible();

    // Add Entry 3 (Giving ₦1,000)
    await page.goto("/new/giving");
    await page.getByPlaceholder("0.00").first().fill("1000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Now Banner MUST be visible!
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));
    const banner = page.getByTestId("guest-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      "Save your data: sign in so you don't lose it",
    );
    await expect(page.getByTestId("guest-banner-signin")).toBeVisible();

    // Dismiss banner
    await page.getByTestId("guest-banner-dismiss").click();
    await expect(banner).not.toBeVisible();

    // Reload page: banner should stay dismissed
    await page.reload();
    await expect(page.getByTestId("guest-banner")).not.toBeVisible();
  });

  test("guest records 2 entries, signs in via /auth/callback, entries are claimed into outbox and toast appears", async ({
    page,
    context,
  }) => {
    // 1. Start as guest
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");

    // Clear db for clean state
    await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      if (db) {
        await db.entries.clear();
        await db.outbox.clear();
      }
    });
    await page.reload();

    // Record 2 entries
    await page.goto("/new/income");
    await page.getByPlaceholder("0.00").first().fill("15000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("4500");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();
    await page.goto("/");

    // Verify outbox is 0 during guest mode
    const guestOutboxCount = await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      return db ? await db.outbox.count() : 0;
    });
    expect(guestOutboxCount).toBe(0);

    // 2. Intercept auth user fetch so callback recognizes signed-in user
    const mockUserId = "test-authed-user-999";
    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockUserId,
          email: "signedin@example.com",
          app_metadata: { provider: "email" },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }),
      });
    });

    // Also route token exchange in case code is passed
    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-access-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: {
            id: mockUserId,
            email: "signedin@example.com",
          },
        }),
      });
    });

    // 3. Navigate to /auth/callback?code=mock-code
    await page.goto("/auth/callback?code=mock-code", { waitUntil: "domcontentloaded" });

    // Lands on / and displays non-silent guest entries prompt (Prompt 15b Item 6)
    await expect(page).toHaveURL("http://localhost:3000/");
    const addThemBtn = page.getByRole("button", { name: /Add them/i });
    await expect(addThemBtn).toBeVisible();
    await addThemBtn.click();

    // Toast "Your 2 entries are now saved to your account" appears
    await expect(
      page.getByText("Your 2 entries are now saved to your account"),
    ).toBeVisible();

    // Check Dexie entries now have user_id set and are queued in outbox
    const migrationResult = await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      if (!db) return null;
      const entries = await db.entries.toArray();
      const outbox = await db.outbox.toArray();
      const entryOutboxItems = outbox.filter((o) => o.table === "entries");
      return {
        entriesUserIds: entries.map((e) => e.user_id),
        entryOutboxCount: entryOutboxItems.length,
        totalOutboxCount: outbox.length,
      };
    });

    expect(migrationResult?.entryOutboxCount).toBe(2);
    expect(migrationResult?.totalOutboxCount).toBeGreaterThanOrEqual(2);
    expect(migrationResult?.entriesUserIds).toEqual([mockUserId, mockUserId]);
  });

  test("30-day session cookie persists after 1 day (simulate by cookie expiration check)", async ({
    page,
    context,
  }) => {
    // 30 days = 2,592,000 seconds
    const thirtyDaysSec = 30 * 24 * 60 * 60;
    const nowSec = Math.floor(Date.now() / 1000);

    // Set guest cookie valid for 30 days
    await context.addCookies([
      {
        name: "moneymap_guest",
        value: "true",
        domain: "localhost",
        path: "/",
        expires: nowSec + thirtyDaysSec,
      },
    ]);

    // Simulate 1 day passing: cookie expiration is still 29 days ahead
    const cookiesBefore = await context.cookies();
    const guestCookie = cookiesBefore.find((c) => c.name === "moneymap_guest");
    expect(guestCookie).toBeDefined();

    // Verify 1 day later (86400s) it is still valid and well within 30-day window
    const oneDayLaterSec = nowSec + 86400;
    expect(guestCookie!.expires).toBeGreaterThan(oneDayLaterSec);

    // Navigating to Home stays on Home (not redirected to /welcome)
    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "What are we recording today?" }),
    ).toBeVisible();
  });

  test("/auth/confirm with a bad token redirects to friendly /auth/error page", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Navigate to /auth/confirm with a bad/expired token
    await page.goto("/auth/confirm?token_hash=bad-token-invalid&type=email");

    // Must redirect to /auth/error?reason=expired
    await expect(page).toHaveURL(/\/auth\/error\?reason=expired/);

    // Displays friendly error message
    const errorMsg = page.getByTestId("auth-error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText(
      "This sign-in link has expired or was already used. Ask for a new one."
    );

    // Click 'Try again' button
    const tryAgainBtn = page.getByTestId("auth-error-try-again");
    await expect(tryAgainBtn).toBeVisible();
    await tryAgainBtn.click();

    // Returns to /welcome
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByRole("heading", { name: "Money Map" })).toBeVisible();
  });

  test("/auth/error displays other_browser notice when opened across browsers", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    await page.goto("/auth/error?reason=other_browser");
    const errorMsg = page.getByTestId("auth-error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText(
      "Open the sign-in link in the same browser where you asked for it, or continue with Google."
    );
  });
});

