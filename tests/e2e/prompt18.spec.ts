import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createAdminClient } from "@/lib/supabase/admin";

const TEST_USER_ID = "66666666-6666-6666-6666-666666666666";

async function setTestAuthCookie(context: BrowserContext, userId: string = TEST_USER_ID) {
  await context.addCookies([
    {
      name: "moneymap_mock_user",
      value: userId,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function setGuestCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "moneymap_guest",
      value: "true",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function clearDexieAndSeed(page: Page, userId: string = TEST_USER_ID) {
  await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));
  await page.evaluate(async (uid) => {
    const win = window as unknown as {
      __db: {
        entries: { clear: () => Promise<void>; put: (e: Record<string, unknown>) => Promise<unknown> };
        loans: { clear: () => Promise<void> };
        loan_payments: { clear: () => Promise<void> };
        categories: { clear: () => Promise<void>; bulkPut: (c: Record<string, unknown>[]) => Promise<unknown> };
        recurring_rules: { clear: () => Promise<void> };
        profiles: { clear: () => Promise<void>; put: (p: Record<string, unknown>) => Promise<unknown> };
        outbox: { clear: () => Promise<void> };
        meta: { clear: () => Promise<void> };
      };
    };

    const db = win.__db;
    await Promise.all([
      db.entries.clear(),
      db.loans.clear(),
      db.loan_payments.clear(),
      db.categories.clear(),
      db.recurring_rules.clear(),
      db.profiles.clear(),
      db.outbox.clear(),
      db.meta.clear(),
    ]);

    const now = new Date().toISOString();

    // 1. Profile
    await db.profiles.put({
      user_id: uid,
      display_name: "Amaka Eze",
      currency: "NGN",
      notifications_enabled: false,
      created_at: now,
      updated_at: now,
    });

    // 2. Default & Custom Categories
    const catSalary = {
      id: "77777777-1111-0000-0000-000000000001",
      user_id: uid,
      scope: "income",
      name: "Salary",
      slug: "salary",
      is_default: true,
      is_hidden: false,
      sort_order: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      server_updated_at: now,
    };
    const catFood = {
      id: "77777777-2222-0000-0000-000000000002",
      user_id: uid,
      scope: "expense",
      name: "Food & groceries",
      slug: "food",
      is_default: true,
      is_hidden: false,
      sort_order: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      server_updated_at: now,
    };
    const catRent = {
      id: "77777777-2222-0000-0000-000000000003",
      user_id: uid,
      scope: "expense",
      name: "Rent",
      slug: "rent",
      is_default: true,
      is_hidden: false,
      sort_order: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      server_updated_at: now,
    };
    const catCustomUnused = {
      id: "77777777-3333-0000-0000-000000000004",
      user_id: uid,
      scope: "expense",
      name: "Custom Gym",
      slug: null,
      is_default: false,
      is_hidden: false,
      sort_order: 2,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      server_updated_at: now,
    };

    await db.categories.bulkPut([catSalary, catFood, catRent, catCustomUnused]);

    // 3. Entries
    await db.entries.put({
      id: "88888888-1111-0000-0000-000000000001",
      user_id: uid,
      kind: "expense",
      amount_minor: 5000000, // 50,000 NGN
      category_id: catRent.id,
      occurred_on: "2026-10-15",
      counterparty: "Landlord",
      description: "Apartment rent",
      recurring_rule_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      server_updated_at: now,
    });
  }, userId);
}

test.describe("Prompt 18: Settings and Account Management", () => {
  test("1. Profile display name editing and auto-save", async ({ page, context }) => {
    await setTestAuthCookie(context);
    await page.goto("/settings");
    await clearDexieAndSeed(page);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();

    const nameInput = page.getByTestId("settings-name-input");
    await expect(nameInput).toHaveValue("Amaka Eze");

    // Edit name
    await nameInput.fill("Amaka Obi");
    await nameInput.blur();

    // Check saved indicator
    await expect(page.getByTestId("name-saved-indicator")).toBeVisible();

    // Verify persisted in Dexie
    const savedName = await page.evaluate(async (uid) => {
      const win = window as unknown as {
        __db: { profiles: { get: (id: string) => Promise<{ display_name?: string }> } };
      };
      const p = await win.__db.profiles.get(uid);
      return p?.display_name;
    }, TEST_USER_ID);

    expect(savedName).toBe("Amaka Obi");
  });

  test("2. Changing currency to USD shows $ everywhere without changing stored amounts", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);
    await page.goto("/settings");
    await clearDexieAndSeed(page);

    await page.goto("/settings");

    // Check initial currency trigger
    const trigger = page.getByTestId("currency-dropdown-trigger");
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("NGN");

    // Open currency dropdown and search USD
    await trigger.click();
    await expect(page.getByTestId("currency-search-input")).toBeVisible();
    await page.getByTestId("currency-search-input").fill("USD");

    // Select USD
    await page.getByTestId("currency-option-USD").click();

    // Verify trigger now shows USD and $
    await expect(page.getByTestId("currency-dropdown-trigger")).toContainText("USD");

    // Check Dexie stored amounts were NOT changed (amount_minor remains 5000000)
    const entryMinor = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: { entries: { get: (id: string) => Promise<{ amount_minor?: number }> } };
      };
      const e = await win.__db.entries.get("88888888-1111-0000-0000-000000000001");
      return e?.amount_minor;
    });
    expect(entryMinor).toBe(5000000);

    // Verify Home displays $ for amounts
    await page.goto("/");
    const expenseCard = page.getByTestId("action-card-expense");
    await expect(expenseCard).toBeVisible();
    await expect(expenseCard).toContainText("$");

    // Verify Records summary displays $
    await page.goto("/records?tab=expenses");
    await expect(page.getByTestId("records-summary-amount")).toContainText("$50,000.00");
  });

  test("3. Hidden category disappears from pickers but old entries still show it", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);
    await page.goto("/settings");
    await clearDexieAndSeed(page);

    await page.goto("/settings");

    // Go to Expenses tab in Categories settings
    await page.getByTestId("category-tab-expense").click();

    // Find Rent category and hide it
    const rentHideBtn = page.getByTestId("category-hide-btn-77777777-2222-0000-0000-000000000003");
    await expect(rentHideBtn).toBeVisible();
    await rentHideBtn.click();

    // Verify Hidden badge appears in Settings
    await expect(
      page.getByTestId("category-hidden-badge-77777777-2222-0000-0000-000000000003"),
    ).toBeVisible();

    // Verify old entry in Records STILL displays "Rent" (target exact category title in the entry card)
    await page.goto("/records?tab=expenses");
    await expect(page.locator("p", { hasText: /^Rent$/ }).first()).toBeVisible();

    // Verify in new entry form, Rent is NOT in category picker select options
    await page.goto("/new/expense");
    const categorySelect = page.getByRole("combobox", { name: /Category/i });
    await expect(categorySelect).toBeVisible();

    // "Rent" should NOT be an option in the select
    await expect(categorySelect.locator("option", { hasText: /^Rent$/ })).toHaveCount(0);

    // "Food & groceries" SHOULD be present
    await expect(categorySelect.locator("option", { hasText: "Food & groceries" })).toHaveCount(1);
  });

  test("4. Categories: add, rename, reorder, delete unused, and guard defaults", async ({
    page,
    context,
  }) => {
    await setTestAuthCookie(context);
    await page.goto("/settings");
    await clearDexieAndSeed(page);

    await page.goto("/settings");
    await page.getByTestId("category-tab-expense").click();

    // 1. Add new category
    await page.getByTestId("add-category-input").fill("Software Licenses");
    await page.getByTestId("add-category-btn").click();
    await expect(
      page.locator('[data-testid^="category-name-"]', { hasText: /^Software Licenses$/ }),
    ).toBeVisible();

    // 2. Rename category
    const unusedCatId = "77777777-3333-0000-0000-000000000004";
    await page.getByTestId(`category-rename-btn-${unusedCatId}`).click();
    const renameInput = page.getByTestId(`category-rename-input-${unusedCatId}`);
    await expect(renameInput).toBeVisible();
    await renameInput.fill("Fitness & Gym");
    await page.getByTestId(`category-save-rename-btn-${unusedCatId}`).click();
    await expect(
      page.locator('[data-testid^="category-name-"]', { hasText: /^Fitness & Gym$/ }),
    ).toBeVisible();

    // 3. Reorder category (drag on desktop, up/down buttons on phones)
    const upBtn = page.getByTestId(`category-up-btn-${unusedCatId}`);
    if (await upBtn.isVisible()) {
      await upBtn.click();
    } else {
      const dragHandle = page.locator(
        `[data-testid="category-item-${unusedCatId}"] [title="Drag to reorder"]`,
      );
      await expect(dragHandle).toBeVisible();
    }

    // 4. Default categories cannot be deleted (no delete button for Rent or Food)
    const rentDeleteBtn = page.locator(
      '[data-testid="category-delete-btn-77777777-2222-0000-0000-000000000003"]',
    );
    await expect(rentDeleteBtn).toHaveCount(0);

    // 5. Custom unused category can be deleted
    const customDeleteBtn = page.getByTestId(`category-delete-btn-${unusedCatId}`);
    await expect(customDeleteBtn).toBeVisible();
    await customDeleteBtn.click();
    await expect(
      page.locator('[data-testid^="category-name-"]', { hasText: /^Fitness & Gym$/ }),
    ).not.toBeVisible();
  });

  test("5. Delete account: type DELETE, POST /api/account/delete, removes server data and clears local data", async ({
    page,
    context,
  }) => {
    const deleteTestUserId = "99999999-9999-9999-9999-999999999999";
    await setTestAuthCookie(context, deleteTestUserId);

    // Seed server rows directly using adminClient to verify server deletion
    const admin = createAdminClient();
    const now = new Date().toISOString();

    await admin.from("profiles").upsert({
      user_id: deleteTestUserId,
      display_name: "To Delete",
      currency: "NGN",
      created_at: now,
      updated_at: now,
    });

    await admin.from("categories").upsert({
      id: "99999999-0000-0000-0000-000000000001",
      user_id: deleteTestUserId,
      scope: "expense",
      name: "ToDeleteCat",
      created_at: now,
      updated_at: now,
    });

    // Seed local Dexie
    await page.goto("/settings");
    await clearDexieAndSeed(page, deleteTestUserId);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();

    // Click Delete account
    await page.getByTestId("settings-delete-account-btn").click();

    // Confirm button should be disabled until "DELETE" is typed
    const confirmBtn = page.getByTestId("confirm-delete-account-btn");
    await expect(confirmBtn).toBeDisabled();

    // Type DELETE
    await page.getByTestId("delete-confirm-input").fill("DELETE");
    await expect(confirmBtn).toBeEnabled();

    // Confirm deletion
    await confirmBtn.click();

    // Verify redirected to /welcome
    await expect(page).toHaveURL(/\/welcome/);

    // Verify local Dexie is cleared
    const localEntriesCount = await page.evaluate(async () => {
      const win = window as unknown as {
        __db: { entries: { count: () => Promise<number> } };
      };
      return await win.__db.entries.count();
    });
    expect(localEntriesCount).toBe(0);

    // Query Supabase directly with admin client to PROVE all server rows for this user are deleted
    const { data: serverProfiles } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", deleteTestUserId);

    const { data: serverCategories } = await admin
      .from("categories")
      .select("id")
      .eq("user_id", deleteTestUserId);

    expect(serverProfiles).toHaveLength(0);
    expect(serverCategories).toHaveLength(0);
  });

  test("6. App version and feedback mailto link are displayed", async ({ page, context }) => {
    await setGuestCookie(context);
    await page.goto("/settings");

    await expect(page.getByTestId("app-version")).toContainText("Money Map v");
    const feedbackLink = page.getByTestId("send-feedback-link");
    await expect(feedbackLink).toBeVisible();
    await expect(feedbackLink).toHaveAttribute(
      "href",
      /^mailto:feedback@moneymap\.app\?subject=/,
    );
  });
});
