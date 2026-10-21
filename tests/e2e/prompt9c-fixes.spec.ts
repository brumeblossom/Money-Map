import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 9c: All Testing Fixes Verification", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("1. Home cards: ₦999,999,999.99 does not overflow at 1024, 1280, 1440px (desktop) and 360px, 390px (mobile)", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { bulkAdd: (items: unknown[]) => Promise<unknown>; clear: () => Promise<unknown> };
          loans: { bulkAdd: (items: unknown[]) => Promise<unknown>; clear: () => Promise<unknown> };
        };
      };
      await win.__db.entries.clear();
      await win.__db.loans.clear();

      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // Large entry: 999,999,999.99 -> 99999999999 minor
      await win.__db.entries.bulkAdd([
        {
          id: "huge-income",
          user_id: "",
          kind: "income",
          category_id: "default-income-1",
          amount_minor: 99999999999,
          occurred_on: today,
          description: "Huge income",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "huge-expense",
          user_id: "",
          kind: "expense",
          category_id: "default-expense-1",
          amount_minor: 99999999999,
          occurred_on: today,
          description: "Huge expense",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "huge-giving",
          user_id: "",
          kind: "giving",
          category_id: "default-giving-1",
          amount_minor: 99999999999,
          occurred_on: today,
          description: "Huge giving",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);

      await win.__db.loans.bulkAdd([
        {
          id: "huge-loan",
          user_id: "",
          counterparty: "Mega Borrower",
          principal_minor: 99999999999,
          interest_type: "none",
          interest_value: 0,
          category_id: "default-lent-1",
          started_on: today,
          due_on: today,
          plan: "one_payment",
          instalment_minor: null,
          remind: true,
          description: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);
    });

    const viewports = isMobile
      ? [
          { width: 390, height: 844, name: "390px" },
          { width: 360, height: 740, name: "360px" },
        ]
      : [
          { width: 1024, height: 768, name: "1024px" },
          { width: 1280, height: 800, name: "1280px" },
          { width: 1440, height: 900, name: "1440px" },
        ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.getByTestId("action-card-income")).toBeVisible();

      // Check all 4 cards: text bounding box must be strictly inside card bounding box
      const cardIds = [
        "action-card-income",
        "action-card-expense",
        "action-card-giving",
        "action-card-lent",
      ];

      for (const cid of cardIds) {
        const card = page.getByTestId(cid);
        await expect(card).toContainText("₦999,999,999.99");

        const cardBox = await card.boundingBox();
        const amountEl = card.getByTestId("action-card-amount");
        const amountBox = await amountEl.boundingBox();

        expect(cardBox).not.toBeNull();
        expect(amountBox).not.toBeNull();

        if (cardBox && amountBox) {
          // Amount text must NOT overflow card horizontally or vertically
          expect(amountBox.x).toBeGreaterThanOrEqual(cardBox.x);
          expect(amountBox.x + amountBox.width).toBeLessThanOrEqual(
            cardBox.x + cardBox.width + 1, // allow 1px subpixel rounding
          );
          expect(amountBox.y + amountBox.height).toBeLessThanOrEqual(
            cardBox.y + cardBox.height + 2,
          );
        }
      }

      // Check card heights are equal
      const heights: number[] = [];
      for (const cid of cardIds) {
        const box = await page.getByTestId(cid).boundingBox();
        if (box) heights.push(Math.round(box.height));
      }
      const allEqual = heights.every((h) => Math.abs(h - heights[0]) <= 2);
      expect(allEqual).toBe(true);

      // Screenshot
      await page.screenshot({
        path: `tests/e2e/screenshots/home-cards-${vp.name}.png`,
        fullPage: false,
      });
    }
  });

  test("2. Commas while typing: typing 1234567.89 into amount input displays 1,234,567.89", async ({
    page,
  }) => {
    await page.goto("/new/income");
    const amountInput = page.getByPlaceholder("0.00").first();
    await expect(amountInput).toBeVisible();

    // Type keystroke by keystroke
    await amountInput.pressSequentially("1234567.89", { delay: 20 });
    expect(await amountInput.inputValue()).toBe("1,234,567.89");

    // Test loan amount lent
    await page.goto("/new/lent");
    const loanAmountInput = page.getByPlaceholder("0.00").first();
    await loanAmountInput.pressSequentially("5000000.5", { delay: 20 });
    expect(await loanAmountInput.inputValue()).toBe("5,000,000.5");
  });

  test("3. Renaming check: No 'Money in' or 'Money out' text in the entire UI", async ({
    page,
  }) => {
    await page.goto("/");
    const pageText = await page.innerText("body");
    expect(pageText).not.toContain("Money in");
    expect(pageText).not.toContain("Money out");

    // Check card labels
    await expect(page.getByTestId("action-card-income")).toContainText("Income");
    await expect(page.getByTestId("action-card-expense")).toContainText("Expenses");

    // Check strip labels
    await expect(page.getByTestId("this-month-strip")).toContainText("Income");
    await expect(page.getByTestId("this-month-strip")).toContainText("Expenses");

    // Check records tabs
    await page.goto("/records");
    await expect(page.getByTestId("records-tab-income")).toContainText("Income");
    await expect(page.getByTestId("records-tab-expenses")).toContainText("Expenses");
  });

  test("4 & 6. Month Switcher & Back-dated entries: September entry appears in September totals", async ({
    page,
  }) => {
    await page.goto("/");

    // Current month displays e.g. "October 2026"
    const monthBtn = page.getByTestId("month-switcher-current");
    await expect(monthBtn).toBeVisible();
    await expect(monthBtn).toContainText("2026");

    // Next month button is disabled
    const nextBtn = page.getByTestId("month-switcher-next");
    await expect(nextBtn).toBeDisabled();

    // Create an entry dated in September 2026
    await page.getByTestId("action-card-income").click();
    await page.getByPlaceholder("0.00").first().fill("50000");

    // Fill date as 15-09-2026
    const dateInput = page.getByPlaceholder("DD-MM-YYYY");
    await dateInput.fill("15-09-2026");

    // Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Toast should say "Saved to September 2026" with "View" button
    const toastElem = page.getByText(/Saved to September 2026/i);
    await expect(toastElem).toBeVisible();
    const viewBtn = page.getByRole("button", { name: "View", exact: true });
    await expect(viewBtn).toBeVisible();

    // Click "View" button in toast -> switches Home to September 2026
    await viewBtn.click();
    await expect(page.getByTestId("month-switcher-current").first()).toContainText("September 2026");

    // September totals should reflect the ₦50,000.00 entry
    await expect(page.getByTestId("month-strip-income").first()).toContainText("₦50,000.00");
    await expect(page.getByTestId("action-card-income").first()).toContainText("₦50,000.00");

    // Tapping month name returns to current month
    await page.getByTestId("month-switcher-current").first().click();
    await expect(page.getByTestId("month-switcher-current").first()).toContainText("October 2026");

    // Previous month arrow ‹ also switches to September
    await page.getByTestId("month-switcher-prev").first().click();
    await expect(page.getByTestId("month-switcher-current").first()).toContainText("September 2026");
    await expect(page.getByTestId("month-strip-income").first()).toContainText("₦50,000.00");
  });

  test("5. Phone Back Button / Back gesture closes modal and returns to filtered records", async ({
    page,
  }) => {
    // 5a. Home -> Income form -> Back closes the form without leaving app
    await page.goto("/");
    const card = page.getByTestId("action-card-income");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByRole("heading", { name: "Income" })).toBeVisible();

    // Press browser Back
    await page.goBack();
    // Modal should close
    await expect(page.getByRole("heading", { name: "Income" })).toBeHidden();
    expect(page.url()).not.toContain("/new/income");

    // 5b. Records -> Expenses tab -> open record -> Back returns to Expenses tab
    // Seed an expense directly so we can test navigation cleanly
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { add: (item: unknown) => Promise<unknown> };
        };
      };
      const now = new Date().toISOString();
      await win.__db.entries.add({
        id: "back-nav-expense-1",
        user_id: "",
        kind: "expense",
        category_id: "default-expense-1",
        amount_minor: 2000000,
        occurred_on: now.slice(0, 10),
        description: "Back Nav Test Expense",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    });

    // Navigate to Records with Expenses tab
    await page.goto("/records?tab=expenses");
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();
    const expenseRow = page.getByTestId("record-row").first();
    await expect(expenseRow).toBeVisible();

    // Open detail by clicking row link
    await expenseRow.getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();

    // Browser back gesture (or detail back button)
    await page.goBack();

    // Must return to Records with Expenses tab active
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();
    expect(page.url()).toContain("tab=expenses");
  });

  test("7-10. Records Screen Redesign: tabs, top summary, dropdown filters, desktop action buttons", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          entries: { bulkAdd: (items: unknown[]) => Promise<unknown>; clear: () => Promise<unknown> };
          loans: { bulkAdd: (items: unknown[]) => Promise<unknown>; clear: () => Promise<unknown> };
        };
      };
      await win.__db.entries.clear();
      await win.__db.loans.clear();

      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      await win.__db.entries.bulkAdd([
        {
          id: "rec-inc-1",
          user_id: "",
          kind: "income",
          category_id: "default-income-1",
          amount_minor: 4500000,
          occurred_on: today,
          description: "Freelance",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "rec-exp-1",
          user_id: "",
          kind: "expense",
          category_id: "default-expense-1",
          amount_minor: 1500000,
          occurred_on: today,
          description: "Fuel",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);

      await win.__db.loans.bulkAdd([
        {
          id: "rec-loan-1",
          user_id: "",
          counterparty: "Tunde",
          principal_minor: 8000000,
          interest_type: "none",
          interest_value: 0,
          category_id: "default-lent-1",
          started_on: today,
          due_on: today,
          plan: "one_payment",
          instalment_minor: null,
          remind: true,
          description: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);
    });

    await page.goto("/records");

    // 1. Top Summary is at the top
    const topSummary = page.getByTestId("records-top-summary");
    await expect(topSummary).toBeVisible();
    await expect(topSummary).toContainText("1 entry · ₦45,000.00");

    // 2. Desktop Edit/Delete buttons are ALWAYS visible on desktop viewport
    const desktopEdit = page.getByTestId("desktop-edit-rec-inc-1");
    const desktopDelete = page.getByTestId("desktop-delete-rec-inc-1");
    // Verify visibility on desktop (desktop project)
    const editVisible = await desktopEdit.isVisible();
    if (page.viewportSize() && page.viewportSize()!.width >= 1024) {
      expect(editVisible).toBe(true);
      await expect(desktopDelete).toBeVisible();
    }

    // 3. Switch to Lent tab -> shows loans list
    await page.getByTestId("records-tab-lent").click();
    await expect(page.getByText("Tunde").first()).toBeVisible();
    await expect(page.getByText("₦80,000.00").first()).toBeVisible();

    // 4. Custom date range filter in Income tab
    await page.getByTestId("records-tab-income").click();
    const periodSelect = page.getByTestId("records-period-select");
    await periodSelect.selectOption("custom");

    // From and To date inputs are visible
    await expect(page.getByRole("textbox", { name: "From" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "To" })).toBeVisible();

    // Capture screenshots of Records
    await page.screenshot({
      path: `tests/e2e/screenshots/records-${page.viewportSize()?.width ?? "view"}.png`,
      fullPage: false,
    });
  });
});
