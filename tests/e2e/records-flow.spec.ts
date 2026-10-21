import { expect, test } from "@playwright/test";

test.describe("Records Flow (Prompt 8)", () => {
  test("create 3 entries, filter to Money out, multi-select, edit amount updates Home, delete and Undo", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. Visit Home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();

    // 2. Add Entry 1: Income (₦100,000)
    await page.getByTestId("action-card-income").click();
    await expect(page.getByRole("heading", { name: "Money in" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("100000");
    const sourceInput = page.getByLabel(/Source/i);
    await sourceInput.fill("Acme Corp");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // 3. Add Entry 2: Expense (₦30,000)
    await page.getByTestId("action-card-expense").click();
    await expect(page.getByRole("heading", { name: "Money out" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("30000");
    const descInput = page.getByLabel(/Description/i);
    await descInput.fill("Groceries");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").last()).toBeVisible();

    // 4. Add Entry 3: Giving (₦10,000)
    await page.getByTestId("action-card-giving").click();
    await expect(page.getByRole("heading", { name: "Giving" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("10000");
    const recipientInput = page.getByLabel(/Recipient/i);
    await recipientInput.fill("Charity");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").last()).toBeVisible();

    // 5. Navigate to /records
    await page.goto("/records");
    await expect(page.getByRole("main").getByRole("heading", { name: "Records" })).toBeVisible();

    // Check all 3 entries are present in the list
    const rows = page.getByTestId("record-row");
    await expect(rows).toHaveCount(3);

    // Verify footer shows count and net total (+100k - 30k - 10k = +60k)
    const footer = page.getByTestId("records-footer");
    await expect(footer).toContainText("3 entries");
    await expect(footer).toContainText("₦60,000.00");

    // 6. Filter to "Money out"
    const moneyOutChip = page.getByRole("button", { name: "Money out" });
    await moneyOutChip.click();

    // Now only the expense entry should be visible
    await expect(page.getByTestId("record-row")).toHaveCount(1);
    await expect(page.getByTestId("record-row").first()).toContainText("₦30,000.00");
    await expect(footer).toContainText("1 entry");
    await expect(footer).toContainText("₦30,000.00");

    // Clear filter by toggling Money out chip again
    await moneyOutChip.click();
    await expect(page.getByTestId("record-row")).toHaveCount(3);

    // 7. Multi-select: select two entries
    // Income entry: +₦100,000.00 and Expense entry: -₦30,000.00
    const incomeRow = page.locator('[data-testid="record-row"][data-entry-kind="income"]').first();
    const expenseRow = page.locator('[data-testid="record-row"][data-entry-kind="expense"]').first();

    const viewport = page.viewportSize();
    const isMobile = Boolean(viewport && viewport.width < 640);

    if (isMobile) {
      // Long press on mobile row to trigger selection mode (500ms threshold)
      const box = await incomeRow.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(600);
        await page.mouse.up();
      }
      await page.waitForTimeout(100);
      // In selection mode, click the second entry to select it too
      await expenseRow.click();
    } else {
      // Desktop: click checkboxes directly
      const incomeCheckbox = incomeRow.getByTestId("record-checkbox");
      const expenseCheckbox = expenseRow.getByTestId("record-checkbox");
      await incomeCheckbox.click();
      await expenseCheckbox.click();
    }

    // Verify selection bar appears with total (+100k - 30k = +70k)
    const selectionBar = page.getByTestId("selection-bar");
    await expect(selectionBar).toBeVisible();
    await expect(selectionBar).toContainText("2 selected");
    await expect(selectionBar).toContainText("₦70,000.00");

    // Clear selection
    await selectionBar.getByLabel("Clear selection").click();
    await expect(selectionBar).not.toBeVisible();

    // 8. Edit entry: navigate to detail of the ₦30,000 expense entry
    await expenseRow.getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
    await expect(page.getByTestId("detail-amount")).toContainText("₦30,000.00");

    // Click Edit button
    await page.getByTestId("detail-edit-button").click();
    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();

    // Update Amount from ₦30,000 to ₦50,000
    const editAmountInput = page.getByPlaceholder("0.00").first();
    await editAmountInput.fill("50000");
    await page.getByRole("button", { name: "Save" }).click();

    // Should return to detail with updated ₦50,000.00
    await expect(page.getByTestId("detail-amount")).toContainText("₦50,000.00");

    // Verify Home card updates: Money out card shows ₦50,000.00
    await page.goto("/");
    const moneyOutCard = page.getByTestId("action-card-expense");
    await expect(moneyOutCard).toContainText("₦50,000.00");

    // 9. Delete entry and Undo
    await page.goto("/records");
    const updatedExpenseRow = page.locator('[data-testid="record-row"][data-entry-kind="expense"]').first();
    await expect(updatedExpenseRow).toBeVisible();
    await updatedExpenseRow.getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();

    // Click Delete button on detail page
    await page.getByTestId("detail-delete-button").click();
    await expect(page.getByText("Delete this entry?")).toBeVisible();

    // Confirm deletion inside the dialog
    const deleteConfirmBtn = page.getByRole("button", { name: "Delete" }).last();
    await deleteConfirmBtn.click();

    // Toast "Entry deleted" with "Undo" button
    const undoBtn = page.getByRole("button", { name: "Undo" }).last();
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Navigate to /records and verify all 3 entries are still present
    await page.goto("/records");
    await expect(page.getByTestId("record-row")).toHaveCount(3);
  });

  test("Swipe left on a row (phones) reveals Edit and Delete", async ({ page }) => {
    // Only test swipe gestures on touch-enabled or mobile viewports
    const phoneViewport = page.viewportSize();
    const isPhone = Boolean(phoneViewport && phoneViewport.width < 640);
    test.skip(isPhone === false, "Swipe gestures are tested on phone viewports");

    // Create 1 entry
    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("15000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").last()).toBeVisible();

    // Navigate to /records
    await page.goto("/records");
    const row = page.getByTestId("record-row").first();
    await expect(row).toBeVisible();

    // Swipe left by 80px
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const startX = box.x + box.width - 40;
      const startY = box.y + box.height / 2;
      await page.touchscreen.tap(startX, startY);
      // Simulate swipe left
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 90, startY, { steps: 5 });
      await page.mouse.up();
    }

    // Verify swipe action buttons are revealed
    await expect(row.getByTestId("swipe-edit")).toBeVisible();
    await expect(row.getByTestId("swipe-delete")).toBeVisible();
  });

  test("Seed 5,000 entries and confirm scrolling stays smooth (no long tasks > 200ms)", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/records");
    await expect(page.getByRole("main").getByRole("heading", { name: "Records" })).toBeVisible();

    // Wait until db is initialized on client
    await page.waitForFunction(() => {
      const win = window as unknown as { __db?: unknown };
      return Boolean(win.__db);
    });

    // Seed 5,000 entries using window.__db.entries.bulkAdd
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: {
            bulkAdd: (items: unknown[]) => Promise<unknown>;
          };
        };
      };

      const items: unknown[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < 5000; i++) {
        const dayOffset = i % 60;
        const d = new Date(Date.now() - dayOffset * 86400000).toISOString().slice(0, 10);
        items.push({
          id: `perf-test-${i}`,
          user_id: "",
          kind: i % 3 === 0 ? "income" : "expense",
          category_id: "default-expense-1",
          amount_minor: 250000,
          occurred_on: d,
          counterparty: `Counterparty ${i}`,
          description: `Description ${i}`,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          server_updated_at: now,
        });
      }

      await win.__db.entries.bulkAdd(items);
    });

    // Verify all 5,000+ entries are loaded and counted in footer
    const footer = page.getByTestId("records-footer");
    await expect(footer).toContainText("5000 entries", { timeout: 15000 });

    // Wait for initial bulk indexing, render, and idle layout to completely settle
    await page.waitForTimeout(2000);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => resolve());
          } else {
            setTimeout(resolve, 300);
          }
        }),
    );

    // Install PerformanceObserver to track long tasks specifically during scrolling
    await page.evaluate(() => {
      (window as unknown as { __longTasks: number[] }).__longTasks = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 200) {
              (window as unknown as { __longTasks: number[] }).__longTasks.push(entry.duration);
            }
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      } catch {
        // Fallback for browsers without longtask support
      }
    });

    // Reset long tasks immediately prior to scrolling so only scroll-induced tasks are recorded
    await page.evaluate(() => {
      (window as unknown as { __longTasks: number[] }).__longTasks = [];
    });

    // Perform smooth virtualized scrolling
    const container = page.getByTestId("records-list-container");
    const box = await container.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 15; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(50);
      }
      for (let i = 0; i < 15; i++) {
        await page.mouse.wheel(0, -200);
        await page.waitForTimeout(50);
      }
    }

    // Confirm no long tasks > 200ms occurred during scrolling
    const scrollLongTasks = await page.evaluate(
      () => (window as unknown as { __longTasks: number[] }).__longTasks || [],
    );
    expect(scrollLongTasks).toHaveLength(0);
  });
});
