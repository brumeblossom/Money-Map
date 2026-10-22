import { test, expect } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Habit Reports (/insights/habits & /insights/habits/[categoryId])", () => {
  test.beforeEach(async ({ context, page }) => {
    await setGuestCookie(context);
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));
  });

  test("dashboard has 'See habits' link navigating to /insights/habits, renders summary, cards, sparklines, details, and works offline", async ({
    page,
    context,
  }) => {
    // 1. Seed Categories & Transactions in Dexie
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          categories: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          profiles: { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> };
          loans: { clear: () => Promise<void> };
          loan_payments: { clear: () => Promise<void> };
        };
      };

      await win.__db.entries.clear();
      await win.__db.categories.clear();
      await win.__db.profiles.clear();
      await win.__db.loans.clear();
      await win.__db.loan_payments.clear();

      await win.__db.profiles.bulkAdd([
        {
          user_id: "test-user",
          currency: "NGN",
          notifications_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const [currY, currM] = today.split("-").map(Number);

      const getIsoMonth = (offset: number) => {
        const d = new Date(Date.UTC(currY, currM - 1 - offset, 1));
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
      };

      const m0 = getIsoMonth(0); // This month
      const m1 = getIsoMonth(1); // 1 month ago
      const m2 = getIsoMonth(2); // 2 months ago
      const m3 = getIsoMonth(3); // 3 months ago

      const foodId = "cat-food-fixture";
      const elecId = "cat-elec-fixture";
      const transId = "cat-trans-fixture";

      await win.__db.categories.bulkAdd([
        {
          id: foodId,
          user_id: "test-user",
          scope: "expense",
          name: "Food",
          slug: "food",
          is_default: true,
          is_hidden: false,
          sort_order: 1,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: elecId,
          user_id: "test-user",
          scope: "expense",
          name: "Electronics",
          slug: "electronics",
          is_default: false,
          is_hidden: false,
          sort_order: 2,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: transId,
          user_id: "test-user",
          scope: "expense",
          name: "Transport",
          slug: "transport",
          is_default: true,
          is_hidden: false,
          sort_order: 3,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      ]);

      const entriesToAdd: Array<Record<string, unknown>> = [];

      // 1. Food: Rises 20% two months in a row
      // M3: ₦100,000, M2: ₦100,000, M1: ₦120,000 (+20%), M0: ₦144,000 (+20%)
      entriesToAdd.push(
        {
          id: "entry-food-m3",
          user_id: "test-user",
          kind: "expense",
          category_id: foodId,
          amount_minor: 100_000_00,
          occurred_on: `${m3}-15`,
          counterparty: "Local Market",
          description: "M3 Groceries",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-food-m2",
          user_id: "test-user",
          kind: "expense",
          category_id: foodId,
          amount_minor: 100_000_00,
          occurred_on: `${m2}-15`,
          counterparty: "Local Market",
          description: "M2 Groceries",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-food-m1",
          user_id: "test-user",
          kind: "expense",
          category_id: foodId,
          amount_minor: 120_000_00,
          occurred_on: `${m1}-15`,
          counterparty: "Local Market",
          description: "M1 Groceries",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-food-m0-1",
          user_id: "test-user",
          kind: "expense",
          category_id: foodId,
          amount_minor: 94_000_00,
          occurred_on: `${m0}-05`,
          counterparty: "Costco",
          description: "Wholesale pantry",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-food-m0-2",
          user_id: "test-user",
          kind: "expense",
          category_id: foodId,
          amount_minor: 50_000_00,
          occurred_on: `${m0}-10`,
          counterparty: "Trader Joe",
          description: "Fresh produce",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      );

      // 2. Electronics: One-off big month (Spike)
      // M3: ₦50,000, M2: ₦50,000, M1: ₦50,000 -> Avg A = ₦50,000.
      // M0: ₦250,000 (>= 2 * A).
      entriesToAdd.push(
        {
          id: "entry-elec-m3",
          user_id: "test-user",
          kind: "expense",
          category_id: elecId,
          amount_minor: 50_000_00,
          occurred_on: `${m3}-10`,
          counterparty: "Gadget Store",
          description: "Cables",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-elec-m2",
          user_id: "test-user",
          kind: "expense",
          category_id: elecId,
          amount_minor: 50_000_00,
          occurred_on: `${m2}-10`,
          counterparty: "Gadget Store",
          description: "Mouse",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-elec-m1",
          user_id: "test-user",
          kind: "expense",
          category_id: elecId,
          amount_minor: 50_000_00,
          occurred_on: `${m1}-10`,
          counterparty: "Gadget Store",
          description: "Keyboard",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-elec-m0",
          user_id: "test-user",
          kind: "expense",
          category_id: elecId,
          amount_minor: 250_000_00,
          occurred_on: `${m0}-08`,
          counterparty: "Apple Store",
          description: "Work MacBook",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      );

      // 3. Transport: Only 2 entries total over the 4 months -> Not enough data yet
      entriesToAdd.push(
        {
          id: "entry-trans-1",
          user_id: "test-user",
          kind: "expense",
          category_id: transId,
          amount_minor: 15_000_00,
          occurred_on: `${m0}-02`,
          counterparty: "Ride Hailing",
          description: "Trip downtown",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-trans-2",
          user_id: "test-user",
          kind: "expense",
          category_id: transId,
          amount_minor: 10_000_00,
          occurred_on: `${m0}-06`,
          counterparty: "Ride Hailing",
          description: "Airport ride",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          server_updated_at: now,
          deleted_at: null,
        },
      );

      await win.__db.entries.bulkAdd(entriesToAdd);
    });

    // 2. Navigate to /insights and check "See habits" link
    await page.goto("/insights");
    const seeHabitsLink = page.getByTestId("see-habits-link");
    await expect(seeHabitsLink).toBeVisible();
    await seeHabitsLink.click();

    // 3. Verify on /insights/habits
    await page.waitForURL("**/insights/habits");
    await expect(page.getByTestId("habits-page-title")).toBeVisible();

    // 4. Verify Habits summary card at top
    const summaryCard = page.getByTestId("habits-summary-card");
    await expect(summaryCard).toBeVisible();

    // Food rose 20% from M1 (₦120,000) to M0 (₦144,000)
    // Electronics rose 400% from M1 (₦50,000) to M0 (₦250,000)
    await expect(summaryCard).toContainText("Rising spending this month");

    // 5. Verify Habit category cards:
    // Categories ranked by spend in period: Electronics (250k) -> Food (144k) -> Transport (25k)
    const elecCard = page.getByTestId("habit-category-card-cat-elec-fixture");
    const foodCard = page.getByTestId("habit-category-card-cat-food-fixture");
    const transCard = page.getByTestId("habit-category-card-cat-trans-fixture");

    await expect(elecCard).toBeVisible();
    await expect(foodCard).toBeVisible();
    await expect(transCard).toBeVisible();

    // Verify badges per test requirements:
    // - Food rises 20% two months in a row -> "Rising"
    await expect(foodCard.getByTestId("habit-badge")).toHaveText("Rising");
    await expect(foodCard).toContainText("Up more than 15% two months in a row");

    // - One-off big month -> "Spike"
    await expect(elecCard.getByTestId("habit-badge")).toHaveText("Spike");
    await expect(elecCard).toContainText("More than double the 3-month average");

    // - Category with 2 entries -> "Not enough data yet"
    await expect(transCard.getByTestId("habit-badge")).toHaveText("Not enough data yet");
    await expect(transCard).toContainText("Fewer than 3 entries in the last 4 months");

    // Verify sparklines rendered inside cards
    await expect(foodCard.getByTestId("category-sparkline")).toBeVisible();
    await expect(elecCard.getByTestId("category-sparkline")).toBeVisible();
    await expect(transCard.getByTestId("category-sparkline")).toBeVisible();

    // Capture screenshots of /insights/habits
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await page.screenshot({ path: "tests/e2e/screenshots/habits-1280.png", fullPage: true });
    } else {
      await page.evaluate(() => {
        const bottomNav = document.querySelector('[data-testid="app-bottom-nav"]') as HTMLElement | null;
        if (bottomNav) bottomNav.style.display = "none";
      });
      await page.screenshot({ path: "tests/e2e/screenshots/habits-390.png", fullPage: true });
    }

    // 6. Test Category Detail Report (/insights/habits/[categoryId])
    await foodCard.click();
    await page.waitForURL("**/insights/habits/cat-food-fixture*");

    // Verify Title & Habit Badge
    await expect(page.getByTestId("category-report-title")).toHaveText("Food");
    const habitBanner = page.getByTestId("category-habit-status-banner");
    await expect(habitBanner.getByTestId("habit-badge")).toHaveText("Rising");
    await expect(page.getByTestId("category-habit-explanation")).toHaveText(
      "Up more than 15% two months in a row",
    );

    // Verify Total and Share
    const totalShareCard = page.getByTestId("category-total-share-card");
    await expect(totalShareCard.getByTestId("category-total-amount")).toHaveText("₦144,000.00");
    await expect(totalShareCard.getByTestId("category-share-percent")).toContainText("% of expenses");

    // Verify 6-month trend chart card
    const chartCard = page.getByTestId("category-trend-chart-card");
    await expect(chartCard).toBeVisible();

    // Verify 3 metrics: count, average, busiest weekday
    await expect(page.getByTestId("category-metric-count")).toContainText("2");
    await expect(page.getByTestId("category-metric-count")).toContainText("entries recorded");
    await expect(page.getByTestId("category-metric-average")).toContainText("₦72,000.00");
    await expect(page.getByTestId("category-metric-weekday")).toBeVisible();

    // Verify Biggest Entry (Costco - ₦94,000.00) and tappable link
    const biggestCard = page.getByTestId("category-biggest-entry-card");
    const biggestLink = biggestCard.getByTestId("biggest-entry-link");
    await expect(biggestLink).toBeVisible();
    await expect(biggestLink).toContainText("Costco");
    await expect(biggestLink).toContainText("₦94,000.00");

    // Capture screenshots of /insights/habits/[categoryId]
    if (viewport && viewport.width >= 1024) {
      await page.screenshot({ path: "tests/e2e/screenshots/habit-detail-1280.png", fullPage: true });
    } else {
      await page.evaluate(() => {
        const bottomNav = document.querySelector('[data-testid="app-bottom-nav"]') as HTMLElement | null;
        if (bottomNav) bottomNav.style.display = "none";
      });
      await page.screenshot({ path: "tests/e2e/screenshots/habit-detail-390.png", fullPage: true });
    }

    // 7. Verify Offline functionality ("Works with the network off")
    await context.setOffline(true);

    // Back button to habits list while offline
    const backButton = page.getByTestId("category-report-back-button");
    await backButton.click();
    await page.waitForURL("**/insights/habits*");

    // Verify habits list still renders perfectly while offline
    await expect(page.getByTestId("habits-page-title")).toBeVisible();
    await expect(page.getByTestId("habit-category-card-cat-food-fixture")).toBeVisible();

    // Restore network
    await context.setOffline(false);
  });
});
