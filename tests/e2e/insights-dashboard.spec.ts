import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Insights Dashboard (Prompt 12)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("dashboard totals match records footer totals exactly, render blocks, and capture screenshots", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Visit Home and wait for IndexedDB initialization
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // 2. Seed controlled fixture data into Dexie
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          loans: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          loan_payments: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          categories: { toArray: () => Promise<Array<{ id: string; slug: string; scope: string }>> };
        };
      };

      await win.__db.entries.clear();
      await win.__db.loans.clear();
      await win.__db.loan_payments.clear();

      const cats = await win.__db.categories.toArray();
      const foodCat = cats.find((c) => c.slug === "food" || (c.scope === "expense" && c.slug?.includes("food")))?.id || "cat-food";
      const rentCat = cats.find((c) => c.slug === "rent" || (c.scope === "expense" && c.slug?.includes("rent")))?.id || "cat-rent";
      const transportCat = cats.find((c) => c.slug === "transport" || (c.scope === "expense" && c.slug?.includes("transport")))?.id || "cat-transport";
      const salaryCat = cats.find((c) => c.slug === "salary" || (c.scope === "income" && c.slug?.includes("salary")))?.id || "cat-salary";
      const giftsCat = cats.find((c) => c.slug === "charity" || c.slug === "family" || c.scope === "giving")?.id || "cat-giving";

      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // Income: ₦120,000 + ₦80,000 = ₦200,000.00 (20,000,000 minor)
      // Expenses: ₦45,000 (Food) + ₦30,000 (Rent) + ₦15,000 (Transport) = ₦90,000.00 (9,000,000 minor)
      // Giving: ₦25,000 + ₦10,000 = ₦35,000.00 (3,500,000 minor)
      // Left over: 200,000 - (90,000 + 35,000) = ₦75,000.00 (7,500,000 minor)

      await win.__db.entries.bulkAdd([
        {
          id: "income-1",
          user_id: "",
          kind: "income",
          category_id: salaryCat,
          amount_minor: 120_000_00,
          occurred_on: today,
          counterparty: "Main Employer",
          description: "Monthly salary",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "income-2",
          user_id: "",
          kind: "income",
          category_id: salaryCat,
          amount_minor: 80_000_00,
          occurred_on: today,
          counterparty: "Freelance Client",
          description: "Design project",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "expense-1",
          user_id: "",
          kind: "expense",
          category_id: foodCat,
          amount_minor: 45_000_00,
          occurred_on: today,
          counterparty: null,
          description: "Monthly groceries",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "expense-2",
          user_id: "",
          kind: "expense",
          category_id: rentCat,
          amount_minor: 30_000_00,
          occurred_on: today,
          counterparty: null,
          description: "Apartment maintenance",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "expense-3",
          user_id: "",
          kind: "expense",
          category_id: transportCat,
          amount_minor: 15_000_00,
          occurred_on: today,
          counterparty: null,
          description: "Fuel and ride passes",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "giving-1",
          user_id: "",
          kind: "giving",
          category_id: giftsCat,
          amount_minor: 25_000_00,
          occurred_on: today,
          counterparty: "Local Shelter",
          description: "Community donation",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "giving-2",
          user_id: "",
          kind: "giving",
          category_id: giftsCat,
          amount_minor: 10_000_00,
          occurred_on: today,
          counterparty: "Church",
          description: "Offering",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      ]);

      // Loan: ₦50,000 principal, ₦20,000 repayment -> balance left ₦30,000.00
      await win.__db.loans.bulkAdd([
        {
          id: "loan-active-1",
          user_id: "",
          counterparty: "Tunde",
          principal_minor: 50_000_00,
          interest_type: "none",
          interest_value: 0,
          started_on: today,
          due_on: today,
          plan: "monthly",
          instalment_minor: 50_000_00,
          category_id: "default-lent-1",
          remind: true,
          description: "Business assistance",
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      ]);

      await win.__db.loan_payments.bulkAdd([
        {
          id: "loan-pay-1",
          user_id: "",
          loan_id: "loan-active-1",
          amount_minor: 20_000_00,
          paid_on: today,
          note: "Part refund",
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      ]);
    });

    // 3. Navigate to /insights
    await page.goto("/insights");
    await expect(page.getByRole("banner").getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Verify 1: Left over card
    const leftOverEl = page.getByTestId("insights-left-over");
    await expect(leftOverEl).toBeVisible();
    await expect(leftOverEl).toContainText("₦75,000.00");

    // Verify 2: Four Tiles
    const incomeTile = page.getByTestId("insights-tile-income");
    const expensesTile = page.getByTestId("insights-tile-expenses");
    const givenTile = page.getByTestId("insights-tile-given");
    const owedTile = page.getByTestId("insights-tile-owed");

    await expect(incomeTile).toContainText("₦200,000.00");
    await expect(expensesTile).toContainText("₦90,000.00");
    await expect(givenTile).toContainText("₦35,000.00");
    await expect(owedTile).toContainText("₦30,000.00");

    const dashIncome = (await incomeTile.innerText()).trim();
    const dashExpenses = (await expensesTile.innerText()).trim();
    const dashGiven = (await givenTile.innerText()).trim();
    const dashOwed = (await owedTile.innerText()).trim();

    // 4. Cross-verify each number against Records screen for the same filter
    // Income tab
    await page.goto("/records?tab=income&period=thisMonth");
    await expect(page.getByTestId("records-tab-income")).toBeVisible();
    const incomeFooter = page.getByTestId("records-footer");
    await expect(incomeFooter).toBeVisible();
    await expect(incomeFooter).toContainText(dashIncome);

    // Expenses tab
    await page.goto("/records?tab=expenses&period=thisMonth");
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();
    const expensesFooter = page.getByTestId("records-footer");
    await expect(expensesFooter).toBeVisible();
    await expect(expensesFooter).toContainText(dashExpenses);

    // Giving tab
    await page.goto("/records?tab=giving&period=thisMonth");
    await expect(page.getByTestId("records-tab-giving")).toBeVisible();
    const givingFooter = page.getByTestId("records-footer");
    await expect(givingFooter).toBeVisible();
    await expect(givingFooter).toContainText(dashGiven);

    // Lent tab
    await page.goto("/records?tab=lent");
    await expect(page.getByTestId("records-tab-lent")).toBeVisible();
    await expect(page.getByText("OWED TO YOU")).toBeVisible();
    await expect(page.locator("body")).toContainText(dashOwed);

    // 5. Navigate back to /insights and verify other blocks
    await page.goto("/insights");

    // Block 3: Spending by category
    await expect(page.getByTestId("insights-spending-by-category-block")).toBeVisible();
    await expect(page.getByTestId("category-donut-chart")).toBeVisible();
    await expect(page.getByTestId("category-ranked-list")).toBeVisible();
    await expect(page.getByTestId("category-ranked-list")).toContainText("₦45,000.00"); // Food
    await expect(page.getByTestId("category-ranked-list")).toContainText("₦30,000.00"); // Rent
    await expect(page.getByTestId("category-ranked-list")).toContainText("₦15,000.00"); // Transport

    // Block 4: Income vs Expenses
    await expect(page.getByTestId("insights-cash-flow-block")).toBeVisible();
    await expect(page.getByTestId("income-vs-expenses-chart")).toBeVisible();

    // Block 5: Money I lent
    await expect(page.getByTestId("insights-lent-block")).toBeVisible();
    await expect(page.getByTestId("insights-lent-total")).toContainText("₦30,000.00");
    await expect(page.getByTestId("active-loans-list")).toContainText("Tunde");
    await expect(page.getByTestId("active-loans-list")).toContainText("₦30,000.00 left");

    // Block 6: Smart tip
    await expect(page.getByTestId("insights-smart-tip-card")).toBeVisible();
    await expect(page.getByTestId("insights-smart-tip-sentence")).toBeVisible();

    // Block 7: Recent entries
    await expect(page.getByTestId("insights-recent-entries-block")).toBeVisible();
    await expect(page.getByTestId("recent-entries-list")).toBeVisible();

    // Test tapping a category row in Spending by category opens filtered records
    const firstCatRow = page.getByTestId("category-ranked-list").locator("button").first();
    await firstCatRow.click();
    await page.waitForURL(/\/records\?tab=expenses/);
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();

    // 6. Return to /insights and take viewport screenshots
    await page.goto("/insights");
    await page.waitForTimeout(1000); // Wait for charts and animations to settle

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await page.screenshot({ path: "tests/e2e/screenshots/insights-1280.png", fullPage: true });
    } else {
      await page.evaluate(() => {
        const bottomNav = document.querySelector('[data-testid="app-bottom-nav"]') as HTMLElement | null;
        if (bottomNav) {
          bottomNav.style.display = "none";
        }
      });
      await page.screenshot({ path: "tests/e2e/screenshots/insights-390.png", fullPage: true });
    }
  });

  test("empty states render friendly message and Add your first entry button", async ({ page }) => {
    // 1. Visit Home and clear all entries & loans
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { clear: () => Promise<void> };
          loans: { clear: () => Promise<void> };
          loan_payments: { clear: () => Promise<void> };
        };
      };
      await win.__db.entries.clear();
      await win.__db.loans.clear();
      await win.__db.loan_payments.clear();
    });

    // 2. Open /insights
    await page.goto("/insights");
    await expect(page.getByRole("banner").getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Left over is ₦0.00
    await expect(page.getByTestId("insights-left-over")).toContainText("₦0.00");

    // Empty state on Spending by category
    await expect(page.getByTestId("spending-empty-state")).toBeVisible();
    await expect(page.getByTestId("spending-empty-state")).toContainText("No expense entries this period");
    await expect(page.getByTestId("spending-empty-state").getByRole("button", { name: "Add your first entry" })).toBeVisible();

    // Empty state on Cash flow
    await expect(page.getByTestId("cash-flow-empty-state")).toBeVisible();
    await expect(page.getByTestId("cash-flow-empty-state")).toContainText("No income or expenses to compare yet");
    await expect(page.getByTestId("cash-flow-empty-state").getByRole("button", { name: "Add your first entry" })).toBeVisible();

    // Empty state on Lent
    await expect(page.getByTestId("lent-empty-state")).toBeVisible();
    await expect(page.getByTestId("lent-empty-state")).toContainText("No active loans right now");
    await expect(page.getByTestId("lent-empty-state").getByRole("button", { name: "Add your first entry" })).toBeVisible();

    // Empty state on Recent entries
    await expect(page.getByTestId("recent-entries-empty-state")).toBeVisible();
    await expect(page.getByTestId("recent-entries-empty-state")).toContainText("No entries in this period");
    await expect(page.getByTestId("recent-entries-empty-state").getByRole("button", { name: "Add your first entry" })).toBeVisible();

    // Tapping "Add your first entry" opens entry modal
    await page.getByTestId("spending-empty-state").getByRole("button", { name: "Add your first entry" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Expenses" })).toBeVisible();
  });
});
