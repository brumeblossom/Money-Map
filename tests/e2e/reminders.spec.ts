import { test, expect } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Reminders (Prompt 15 / US-4.3 & US-5.1)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("shows due loans and repeating entries in Home Due section, hides paid off loans, and toggles Settings switch", async ({
    page,
    viewport,
  }) => {
    test.setTimeout(60_000);

    // 1. Set fixed system time to 2026-10-22
    await page.clock.setSystemTime(new Date("2026-10-22T10:00:00Z"));

    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // 2. Clear Dexie and seed:
    // - Loan 1: Ada, ₦27,500.00 due on 2026-10-24 (in 2 days) -> SHOULD SHOW
    // - Loan 2: Chidi, ₦50,000.00 due on 2026-10-23 with 50,000 payment (PAID OFF) -> SHOULD NOT SHOW
    // - Loan 3: Far future, due on 2026-11-20 -> SHOULD NOT SHOW
    // - Recurring Rule: Rent, ₦150,000.00 due on 2026-10-22 (today) -> SHOULD SHOW "Add it"
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db?: {
          entries: { clear: () => Promise<void> };
          loans: {
            clear: () => Promise<void>;
            put: (loan: unknown) => Promise<void>;
          };
          loan_payments: {
            clear: () => Promise<void>;
            put: (pay: unknown) => Promise<void>;
          };
          recurring_rules: {
            clear: () => Promise<void>;
            put: (rule: unknown) => Promise<void>;
          };
        };
      };

      if (win.__db) {
        await win.__db.entries.clear();
        await win.__db.loans.clear();
        await win.__db.loan_payments.clear();
        await win.__db.recurring_rules.clear();

        const now = new Date().toISOString();

        // Loan 1: Ada, expected back in 2 days
        await win.__db.loans.put({
          id: "loan-ada-1",
          counterparty: "Ada",
          principal_minor: 2750000,
          category_id: null,
          started_on: "2026-10-01",
          due_on: "2026-10-24", // 2 days from today
          plan: "one_payment",
          instalment_minor: null,
          interest_type: "none",
          interest_value: 0,
          remind: true,
          description: "Emergency loan",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        // Loan 2: Chidi, paid off
        await win.__db.loans.put({
          id: "loan-chidi-paid",
          counterparty: "Chidi",
          principal_minor: 5000000,
          category_id: null,
          started_on: "2026-10-01",
          due_on: "2026-10-23", // tomorrow
          plan: "one_payment",
          instalment_minor: null,
          interest_type: "none",
          interest_value: 0,
          remind: true,
          description: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        await win.__db.loan_payments.put({
          id: "pay-chidi-full",
          loan_id: "loan-chidi-paid",
          amount_minor: 5000000,
          paid_on: "2026-10-15",
          note: "Repaid in full",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        // Loan 3: Far future (in 30 days)
        await win.__db.loans.put({
          id: "loan-future",
          counterparty: "Emeka",
          principal_minor: 10000000,
          category_id: null,
          started_on: "2026-10-01",
          due_on: "2026-11-22",
          plan: "one_payment",
          instalment_minor: null,
          interest_type: "none",
          interest_value: 0,
          remind: true,
          description: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        // Recurring Rule: Rent, due today
        await win.__db.recurring_rules.put({
          id: "rule-rent-today",
          kind: "expense",
          amount_minor: 15000000,
          category_id: null,
          counterparty: "Landlord",
          description: "Rent",
          frequency: "monthly",
          next_due_on: "2026-10-22", // due today!
          is_paused: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    });

    // Reload Home
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // 3. Verify Home "Due" section
    const dueSection = page.locator('[data-testid="home-due-section"]');
    await expect(dueSection).toBeVisible();

    const dueHeading = page.locator('[data-testid="due-section-heading"]');
    await expect(dueHeading).toHaveText("Due");

    // Ada's loan shows: "Ada is due to pay back ₦27,500.00 on 24-10-2026"
    const adaLoanCard = page.locator('[data-testid="due-loan-loan-ada-1"]');
    await expect(adaLoanCard).toBeVisible();
    await expect(adaLoanCard).toContainText("Ada is due to pay back ₦27,500.00 on 24-10-2026");

    // Paid-off loan (Chidi) does NOT show in Due section
    await expect(page.locator('[data-testid="due-loan-loan-chidi-paid"]')).toHaveCount(0);
    await expect(dueSection).not.toContainText("Chidi");

    // Far future loan (Emeka) does NOT show in Due section
    await expect(page.locator('[data-testid="due-loan-loan-future"]')).toHaveCount(0);
    await expect(dueSection).not.toContainText("Emeka");

    // Repeating entry due today shows "Add it" and message
    const repeatCard = page.locator('[data-testid="recurring-banner-card"]');
    await expect(repeatCard).toBeVisible();
    await expect(repeatCard).toContainText("Rent ₦150,000.00 is due today. Add it?");

    const addItBtn = page.locator('[data-testid="recurring-banner-add"]');
    await expect(addItBtn).toBeVisible();
    await expect(addItBtn).toContainText("Add it");

    // Capture Home screenshot with Due section
    const isMobile = (viewport?.width ?? 1280) < 1024;
    await page.screenshot({
      path: isMobile
        ? "tests/e2e/screenshots/reminders-home-390.png"
        : "tests/e2e/screenshots/reminders-home-1280.png",
      fullPage: true,
    });

    // 4. Tap the loan card -> navigates to /lent/loan-ada-1
    await adaLoanCard.click();
    await page.waitForURL("**/lent/loan-ada-1");
    await expect(page.locator("body")).toContainText("Ada");

    // 5. Return to Home and test "Add it"
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // Tap "Add it"
    await page.locator('[data-testid="recurring-banner-add"]').click();

    // Verify toast
    await expect(page.locator("body")).toContainText("Added Rent");

    // Repeating item disappears from Due section!
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toHaveCount(0);

    // Verify exactly 1 entry created
    const entryCount = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: { entries: { count: () => Promise<number> } };
      };
      return await win.__db.entries.count();
    });
    expect(entryCount).toBe(1);

    // 6. Verify Settings > Reminders switch
    await page.goto("/settings");
    await page.waitForSelector("#reminders");

    const remindersSection = page.locator("#reminders");
    await expect(remindersSection).toBeVisible();
    await expect(remindersSection).toContainText("Email me a daily reminder");

    const emailSwitch = page.locator('[data-testid="email-reminders-switch"]');
    await expect(emailSwitch).toBeVisible();
    // Default is off
    await expect(emailSwitch).not.toBeChecked();

    // Toggle switch on
    await emailSwitch.click();
    await expect(emailSwitch).toBeChecked();
    await expect(page.locator("body")).toContainText("Daily email reminders enabled");

    // Capture Settings screenshot with Reminders switch
    await page.screenshot({
      path: isMobile
        ? "tests/e2e/screenshots/reminders-settings-390.png"
        : "tests/e2e/screenshots/reminders-settings-1280.png",
      fullPage: true,
    });
  });
});
