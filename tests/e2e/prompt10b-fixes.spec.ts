import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 10b: Category Dedup, Records Add Buttons, Lent Back Nav", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("1. Category dropdown shows each option exactly once for guest and after sign-in + sync", async ({
    page,
  }) => {
    // 1. Check guest category dropdowns for each form action
    const actions = ["income", "expense", "giving", "lent"] as const;

    for (const action of actions) {
      await page.goto(`/new/${action}`);
      await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

      const select = page.getByRole("combobox", { name: "Category" });
      await expect(select).toBeVisible();

      // Read all option texts
      const optionTexts = await select.evaluate((sel: HTMLSelectElement) => {
        return Array.from(sel.options).map((o) => o.textContent?.trim() || "");
      });

      // Filter out placeholder e.g. "Select a category" or "Other"
      const realOptions = optionTexts.filter((t) => t && !t.includes("Select"));
      const uniqueOptions = Array.from(new Set(realOptions));

      // Assert no duplicates
      expect(
        realOptions.length,
        `Expected all category options to be unique for action "${action}", found duplicates: ${JSON.stringify(realOptions)}`,
      ).toBe(uniqueOptions.length);
    }

    // 2. Simulate signed-in user + sync and verify no duplicate categories appear
    await page.context().addCookies([
      {
        name: "moneymap_mock_user",
        value: "user-sync-test-456",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Re-seed and trigger deduplication
    await page.goto("/new/expense");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // Duplicate check on expense form after user session active
    const expenseSelect = page.getByRole("combobox", { name: "Category" });
    await expect(expenseSelect).toBeVisible();

    const optionTexts = await expenseSelect.evaluate((sel: HTMLSelectElement) => {
      return Array.from(sel.options).map((o) => o.textContent?.trim() || "");
    });
    const realOptions = optionTexts.filter((t) => t && !t.includes("Select"));
    const uniqueOptions = Array.from(new Set(realOptions));

    expect(
      realOptions.length,
      `Expected unique categories after sign-in, found duplicates: ${JSON.stringify(realOptions)}`,
    ).toBe(uniqueOptions.length);
  });

  test("2. Each Records tab add button opens matching form and saving stays on tab", async ({
    page,
  }) => {
    await page.goto("/records");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    const viewport = page.viewportSize();
    const isDesktop = Boolean(viewport && viewport.width >= 1024);

    // Test each tab: Income, Expenses, Giving, Lent
    const tabTests = [
      {
        tabId: "records-tab-income",
        tabParam: "income",
        expectedHeading: "Income",
        buttonLabel: "Add income",
        amountStr: "35000",
        description: "Freelance Payment",
        counterparty: "Client Acme",
      },
      {
        tabId: "records-tab-expenses",
        tabParam: "expenses",
        expectedHeading: "Expenses",
        buttonLabel: "Add expense",
        amountStr: "12500",
        description: "Dinner out",
        counterparty: "Restaurant",
      },
      {
        tabId: "records-tab-giving",
        tabParam: "giving",
        expectedHeading: "Giving",
        buttonLabel: "Add giving",
        amountStr: "5000",
        description: "Community Support",
        counterparty: "Local Center",
      },
      {
        tabId: "records-tab-lent",
        tabParam: "lent",
        expectedHeading: "Money I lent",
        buttonLabel: "Lend money",
        amountStr: "20000",
        borrower: "Chidi",
      },
    ];

    for (const item of tabTests) {
      // 1. Click Tab
      await page.getByTestId(item.tabId).click();
      await expect(page).toHaveURL(new RegExp(`tab=${item.tabParam}`));

      // 2. Check Add button (desktop button at right end of filter row or mobile round FAB)
      if (isDesktop) {
        const desktopAddBtn = page.getByTestId("records-desktop-add-button");
        await expect(desktopAddBtn).toBeVisible();
        await expect(desktopAddBtn).toContainText(item.buttonLabel);
        await desktopAddBtn.click();
      } else {
        const fabBtn = page.getByTestId("records-fab-add-button");
        await expect(fabBtn).toBeVisible();
        await fabBtn.click();
      }

      // 3. Verify matching form modal opens
      await expect(page.getByRole("heading", { name: item.expectedHeading })).toBeVisible();

      // 4. Fill and submit form
      if (item.tabParam === "lent") {
        await page.getByPlaceholder("Who did you lend to?").fill(item.borrower!);
        await page.getByPlaceholder("0.00").first().fill(item.amountStr);

        // Category
        const catSelect = page.getByRole("combobox", { name: "Category" });
        await catSelect.selectOption({ index: 1 });

        // Expected back date
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const dd = String(nextMonth.getDate()).padStart(2, "0");
        const mm = String(nextMonth.getMonth() + 1).padStart(2, "0");
        const yyyy = nextMonth.getFullYear();
        await page.getByLabel("Expected back by").fill(`${dd}-${mm}-${yyyy}`);

        await page.getByRole("button", { name: /save/i }).click();
      } else {
        await page.getByPlaceholder("0.00").first().fill(item.amountStr);
        const catSelect = page.getByRole("combobox", { name: "Category" });
        await catSelect.selectOption({ index: 1 });
        await page.getByPlaceholder("Optional notes or details").fill(item.description!);
        await page.getByRole("button", { name: "Save", exact: true }).click();
      }

      // 5. Verify user stays on the same tab
      await expect(page).toHaveURL(new RegExp(`tab=${item.tabParam}`));
      const activeTabBtn = page.getByTestId(item.tabId);
      await expect(activeTabBtn).toHaveAttribute("aria-selected", "true");

      // 6. Verify record appears in the list
      if (item.tabParam === "lent") {
        await expect(page.getByText(item.borrower!).first()).toBeVisible();
      } else {
        await expect(page.getByText(item.description!).first()).toBeVisible();
      }
    }
  });

  test("3. Lent back navigation returns to Records with Lent tab and 4 tabs visible", async ({
    page,
  }) => {
    // 1. Visit Records Lent tab directly
    await page.goto("/records?tab=lent");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    // Seed a loan in Dexie
    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          loans: { put: (item: unknown) => Promise<unknown> };
        };
      };
      const now = new Date().toISOString();
      await win.__db.loans.put({
        id: "test-loan-nav-123",
        user_id: "",
        category_id: "default-lent-1",
        counterparty: "Emeka",
        principal_minor: 4500000,
        started_on: "2026-10-01",
        due_on: "2026-11-01",
        plan: "one_payment",
        instalment_minor: null,
        interest_type: "none",
        interest_value: 0,
        remind: true,
        description: "Equipment purchase",
        server_updated_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    });

    await page.reload();
    await expect(page.getByText("Emeka").first()).toBeVisible();

    // 2. Open loan detail
    await page.getByText("Emeka").first().click();
    await page.waitForURL(/\/lent\/test-loan-nav-123/);
    await expect(page.getByRole("heading", { name: "Emeka" })).toBeVisible();

    // 3. Test App Back Arrow
    const backBtn = page.getByRole("button", { name: /money i lent/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Must return to /records?tab=lent with 4 tabs visible
    await page.waitForURL(/\/records\?tab=lent/);
    await expect(page.getByTestId("records-tab-income")).toBeVisible();
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();
    await expect(page.getByTestId("records-tab-giving")).toBeVisible();
    await expect(page.getByTestId("records-tab-lent")).toBeVisible();
    await expect(page.getByTestId("records-tab-lent")).toHaveAttribute("aria-selected", "true");

    // 4. Test Browser Back gesture
    await page.getByText("Emeka").first().click();
    await page.waitForURL(/\/lent\/test-loan-nav-123/);

    await page.goBack();
    await page.waitForURL(/\/records\?tab=lent/);
    await expect(page.getByTestId("records-tab-lent")).toBeVisible();
    await expect(page.getByTestId("records-tab-lent")).toHaveAttribute("aria-selected", "true");

    // 5. Test Home "Money I lent" card navigates to Records Lent tab
    await page.goto("/");
    const lentCard = page.getByTestId("action-card-lent");
    await expect(lentCard).toBeVisible();
    await lentCard.click();

    await page.waitForURL(/\/records\?tab=lent/);
    await expect(page.getByTestId("records-tab-lent")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("records-tab-income")).toBeVisible();

    // 6. Test old /lent redirect
    await page.goto("/lent");
    await page.waitForURL(/\/records\?tab=lent/);
    await expect(page.getByTestId("records-tab-lent")).toHaveAttribute("aria-selected", "true");

    // Capture screenshot
    const width = page.viewportSize()?.width ?? "view";
    await page.screenshot({
      path: `tests/e2e/screenshots/prompt10b-lent-records-${width}.png`,
      fullPage: false,
    });
  });
});
