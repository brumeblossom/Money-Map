import { test, expect } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Repeating Entries (US-5.1 Prompt 14)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("creates monthly repeating expense, moves clock forward a month (page.clock), verifies banner, Add, Skip, and Settings management", async ({
    page,
    viewport,
  }) => {
    test.setTimeout(60_000);

    // 1. Initialize clock to 2026-10-22 using page.clock
    await page.clock.setSystemTime(new Date("2026-10-22T10:00:00Z"));

    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // Clean Dexie tables
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db?: {
          entries: { clear: () => Promise<void> };
          recurring_rules: { clear: () => Promise<void> };
          loans: { clear: () => Promise<void> };
          loan_payments: { clear: () => Promise<void> };
        };
      };
      if (win.__db) {
        await win.__db.entries.clear();
        await win.__db.recurring_rules.clear();
        await win.__db.loans.clear();
        await win.__db.loan_payments.clear();
      }
    });

    // 2. Add an expense with Repeats = Monthly
    await page.goto("/new/expense");
    await page.waitForSelector("#amount-input");

    // Enter Amount: 150000 (₦150,000)
    const amountInput = page.locator("#amount-input");
    await amountInput.fill("150000");

    // Enter Description: Rent
    const descInput = page.locator("#description-input");
    await descInput.fill("Rent");

    // Select Repeats: Monthly
    const repeatsSelect = page.locator("#repeats-select");
    await repeatsSelect.selectOption("Monthly");

    // Submit form
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for save toast
    await expect(page.locator("body")).toContainText("Saved");

    // Verify Dexie state: 1 entry created, 1 recurring rule created
    const initialCounts = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { toArray: () => Promise<Array<{ id: string; amount_minor: number; occurred_on: string }>> };
          recurring_rules: {
            toArray: () => Promise<
              Array<{
                id: string;
                description: string | null;
                frequency: string;
                next_due_on: string;
                is_paused: boolean;
              }>
            >;
          };
        };
      };
      const entries = await win.__db.entries.toArray();
      const rules = await win.__db.recurring_rules.toArray();
      return { entries, rules };
    });

    expect(initialCounts.entries).toHaveLength(1);
    expect(initialCounts.entries[0].amount_minor).toBe(15000000);
    expect(initialCounts.rules).toHaveLength(1);
    expect(initialCounts.rules[0].description).toBe("Rent");
    expect(initialCounts.rules[0].frequency).toBe("monthly");
    expect(initialCounts.rules[0].next_due_on).toBe("2026-11-22");
    expect(initialCounts.rules[0].is_paused).toBe(false);

    // On 2026-10-22, rule is due 2026-11-22 (future), so banner must NOT be visible on Home
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toHaveCount(0);

    // 3. Move the clock forward a month using page.clock (to 2026-11-22)
    await page.clock.setSystemTime(new Date("2026-11-22T12:00:00Z"));
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // The banner appears!
    const banner = page.locator('[data-testid="recurring-banner-card"]');
    await expect(banner).toBeVisible();

    const bannerMsg = page.locator('[data-testid="recurring-banner-message"]');
    await expect(bannerMsg).toContainText("Rent");
    await expect(bannerMsg).toContainText("is due today. Add it?");

    // Verify all 3 action buttons are present
    const addBtn = page.locator('[data-testid="recurring-banner-add"]');
    const editBtn = page.locator('[data-testid="recurring-banner-edit"]');
    const skipBtn = page.locator('[data-testid="recurring-banner-skip"]');

    await expect(addBtn).toBeVisible();
    await expect(editBtn).toBeVisible();
    await expect(skipBtn).toBeVisible();

    // Capture screenshot of Home banner
    const isMobile = (viewport?.width ?? 1280) < 1024;
    await page.screenshot({
      path: isMobile
        ? "tests/e2e/screenshots/recurring-banner-390.png"
        : "tests/e2e/screenshots/recurring-banner-1280.png",
      fullPage: true,
    });

    // 4. Test "Add": Tapping Add creates exactly one entry dated today (2026-11-22)
    // and advances next_due_on by one period (to 2026-12-22)
    await addBtn.click();

    // Banner disappears immediately because next_due_on is now in the future
    await expect(banner).toHaveCount(0);

    // Verify Dexie state after Add:
    const afterAddCounts = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { toArray: () => Promise<Array<{ id: string; amount_minor: number; occurred_on: string }>> };
          recurring_rules: {
            toArray: () => Promise<
              Array<{
                id: string;
                next_due_on: string;
              }>
            >;
          };
        };
      };
      const entries = await win.__db.entries.toArray();
      const rules = await win.__db.recurring_rules.toArray();
      return { entries, rules };
    });

    // Exactly 2 entries total now (initial + 1 from Add)
    expect(afterAddCounts.entries).toHaveLength(2);
    const addedEntry = afterAddCounts.entries.find((e) => e.occurred_on === "2026-11-22");
    expect(addedEntry).toBeDefined();
    expect(addedEntry?.amount_minor).toBe(15000000);

    // Rule advanced to 2026-12-22
    expect(afterAddCounts.rules[0].next_due_on).toBe("2026-12-22");

    // 5. Move the clock forward another month to 2026-12-22
    await page.clock.setSystemTime(new Date("2026-12-22T12:00:00Z"));
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // Banner appears again
    await expect(banner).toBeVisible();
    await expect(bannerMsg).toContainText("Rent");

    // 6. Test "Skip": Tapping Skip creates NO entry and moves the date
    await skipBtn.click();

    // Banner disappears
    await expect(banner).toHaveCount(0);

    // Verify Dexie state after Skip:
    const afterSkipCounts = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { toArray: () => Promise<Array<{ id: string }>> };
          recurring_rules: {
            toArray: () => Promise<
              Array<{
                id: string;
                next_due_on: string;
              }>
            >;
          };
        };
      };
      const entries = await win.__db.entries.toArray();
      const rules = await win.__db.recurring_rules.toArray();
      return { entries, rules };
    });

    // Entries count unchanged (still exactly 2!)
    expect(afterSkipCounts.entries).toHaveLength(2);

    // Rule advanced to 2027-01-22
    expect(afterSkipCounts.rules[0].next_due_on).toBe("2027-01-22");

    // 7. Verify Settings > Repeating entries
    await page.goto("/settings/repeating");
    await page.waitForSelector('[data-testid="recurring-rules-list"]');

    // Rule listed with amount, frequency, next date
    const ruleRow = page.locator('[data-testid^="recurring-rule-row-"]');
    await expect(ruleRow).toBeVisible();
    await expect(ruleRow).toContainText("Rent");
    await expect(ruleRow).toContainText("₦150,000.00");
    await expect(ruleRow).toContainText("Monthly");
    await expect(ruleRow).toContainText("22-01-2027");

    // Capture screenshot of Settings repeating entries
    await page.screenshot({
      path: isMobile
        ? "tests/e2e/screenshots/recurring-settings-390.png"
        : "tests/e2e/screenshots/recurring-settings-1280.png",
      fullPage: true,
    });

    // Test Pause and Resume
    const pauseBtn = page.locator('[data-testid="rule-pause-btn"]');
    await pauseBtn.click();

    const statusBadge = page.locator('[data-testid="rule-status-badge"]');
    await expect(statusBadge).toHaveText("Paused");

    const resumeBtn = page.locator('[data-testid="rule-resume-btn"]');
    await expect(resumeBtn).toBeVisible();

    // Fast-forward past next date while paused (2027-01-25)
    await page.clock.setSystemTime(new Date("2027-01-25T12:00:00Z"));
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // Paused rule should NOT show banner!
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toHaveCount(0);

    // Resume the rule
    await page.goto("/settings/repeating");
    await page.waitForSelector('[data-testid="rule-resume-btn"]');
    await page.locator('[data-testid="rule-resume-btn"]').click();
    await expect(page.locator('[data-testid="rule-status-badge"]')).toHaveText("Active");

    // Go to Home: now overdue banner appears!
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="recurring-banner-message"]')).toContainText(
      "was due on 22-01-2027. Add it?",
    );

    // Test Delete
    await page.goto("/settings/repeating");
    await page.waitForSelector('[data-testid="rule-delete-btn"]');
    await page.locator('[data-testid="rule-delete-btn"]').click();

    // Empty state appears
    await expect(page.locator('[data-testid="no-recurring-rules"]')).toBeVisible();

    // On Home, banner no longer shows
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toHaveCount(0);
  });

  test("Edit first opens pre-filled form, modifying and saving advances rule and creates entry", async ({
    page,
  }) => {
    // 1. Set system time to 2026-10-22
    await page.clock.setSystemTime(new Date("2026-10-22T10:00:00Z"));

    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    // Clean Dexie tables and insert an active weekly recurring rule due today
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db?: {
          entries: { clear: () => Promise<void> };
          recurring_rules: {
            clear: () => Promise<void>;
            put: (rule: unknown) => Promise<void>;
          };
        };
      };
      if (win.__db) {
        await win.__db.entries.clear();
        await win.__db.recurring_rules.clear();
        await win.__db.recurring_rules.put({
          id: "rule-gym-test-1",
          kind: "expense",
          amount_minor: 1500000, // ₦15,000.00
          category_id: null,
          counterparty: "Gym",
          description: "Gym Membership",
          frequency: "weekly",
          next_due_on: "2026-10-22", // due today!
          is_paused: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        });
      }
    });

    // Reload home to show banner
    await page.goto("/");
    await page.waitForSelector('[data-testid="this-month-strip"]');

    const banner = page.locator('[data-testid="recurring-banner-card"]');
    await expect(banner).toBeVisible();
    await expect(page.locator('[data-testid="recurring-banner-message"]')).toContainText(
      "Gym Membership",
    );
    await expect(page.locator('[data-testid="recurring-banner-message"]')).toContainText(
      "is due today. Add it?",
    );

    // Tap "Edit first"
    const editBtn = page.locator('[data-testid="recurring-banner-edit"]');
    await editBtn.click();

    // Verify modal is open and pre-filled
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const descInput = page.locator("#description-input");
    await expect(descInput).toHaveValue("Gym Membership");

    // Modify amount from 15000 to 20000
    const amountInput = page.locator("#amount-input");
    await amountInput.fill("20000");

    // Submit form
    const submitBtn = modal.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for save
    await expect(page.locator("body")).toContainText("Saved");

    // Banner disappears because rule is advanced to next week (2026-10-29)
    await expect(page.locator('[data-testid="recurring-banner-card"]')).toHaveCount(0);

    // Verify Dexie state: 1 entry created with ₦20,000.00 and rule next_due_on = 2026-10-29
    const dexieState = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { toArray: () => Promise<Array<{ amount_minor: number; description: string | null }>> };
          recurring_rules: { toArray: () => Promise<Array<{ next_due_on: string }>> };
        };
      };
      const entries = await win.__db.entries.toArray();
      const rules = await win.__db.recurring_rules.toArray();
      return { entries, rules };
    });

    expect(dexieState.entries).toHaveLength(1);
    expect(dexieState.entries[0].amount_minor).toBe(2000000);
    expect(dexieState.entries[0].description).toBe("Gym Membership");
    expect(dexieState.rules[0].next_due_on).toBe("2026-10-29");
  });
});

