import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 22 Fixes Verification", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("1. Guest button: single line at 360px phone and 1280px desktop, correct text & link", async ({
    page,
  }) => {
    // Check mobile (360px viewport)
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/settings");
    const guestBtn = page.getByTestId("settings-guest-signin-link");
    await expect(guestBtn).toBeVisible();
    await expect(guestBtn).toHaveText("Sign in to back up your data");
    await expect(guestBtn).toHaveAttribute("href", "/welcome?intent=signin");

    // Verify it fits on a single line (bounding box height <= 48px)
    const boxMobile = await guestBtn.boundingBox();
    expect(boxMobile).not.toBeNull();
    if (boxMobile) {
      expect(boxMobile.height).toBeLessThanOrEqual(50);
    }

    // Check desktop (1280px viewport)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/settings");
    const guestBtnDesktop = page.getByTestId("settings-guest-signin-link");
    await expect(guestBtnDesktop).toBeVisible();
    await expect(guestBtnDesktop).toHaveText("Sign in to back up your data");
    const boxDesktop = await guestBtnDesktop.boundingBox();
    expect(boxDesktop).not.toBeNull();
    if (boxDesktop) {
      expect(boxDesktop.height).toBeLessThanOrEqual(50);
    }
  });

  test("2. Settings sub-pages: arrow icon only, aria-label, correct header title", async ({
    page,
  }) => {
    // /settings/categories
    await page.goto("/settings/categories");
    const catBackBtn = page.getByTestId("categories-back-btn");
    await expect(catBackBtn).toBeVisible();
    await expect(catBackBtn).toHaveAttribute("aria-label", "Back to Settings");
    // Verify no text node inside
    await expect(catBackBtn).toHaveText("");
    // Verify 40x40 tap area (size-10 = 40px)
    const catBox = await catBackBtn.boundingBox();
    expect(catBox).not.toBeNull();
    if (catBox) {
      expect(Math.round(catBox.width)).toBe(40);
      expect(Math.round(catBox.height)).toBe(40);
    }
    // Verify app-header title says "Categories"
    const headerTitleCat = page.locator("header h1, [data-testid='app-header-title']");
    await expect(headerTitleCat.first()).toContainText("Categories");

    // /settings/repeating
    await page.goto("/settings/repeating");
    const repBackBtn = page.getByTestId("repeating-back-btn");
    await expect(repBackBtn).toBeVisible();
    await expect(repBackBtn).toHaveAttribute("aria-label", "Back to Settings");
    await expect(repBackBtn).toHaveText("");
    const repBox = await repBackBtn.boundingBox();
    expect(repBox).not.toBeNull();
    if (repBox) {
      expect(Math.round(repBox.width)).toBe(40);
      expect(Math.round(repBox.height)).toBe(40);
    }
    // Verify app-header title says "Repeating entries"
    const headerTitleRep = page.locator("header h1, [data-testid='app-header-title']");
    await expect(headerTitleRep.first()).toContainText("Repeating entries");
  });

  test("3. Currency formatting: symbol in front, comma for thousands, point for decimals", async ({
    page,
  }) => {
    // Navigate to settings and switch currency to EUR
    await page.goto("/settings");
    const currencyTrigger = page.getByTestId("currency-dropdown-trigger");
    await expect(currencyTrigger).toBeVisible();
    await currencyTrigger.click();
    const eurOption = page.getByTestId("currency-option-EUR");
    await expect(eurOption).toBeVisible();
    await eurOption.click();

    // Create an entry with 50000 EUR
    await page.goto("/new/expense");
    await page.getByPlaceholder("0.00").first().fill("50000");
    await page.getByLabel(/Description/i).fill("Laptop purchase");
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify formatting on Records page
    await page.goto("/records?tab=expenses");
    const row = page.getByTestId("record-row").first();
    await expect(row).toBeVisible();
    // Must be €50,000.00, NEVER 50.000,00 €
    await expect(row).toContainText("€50,000.00");
    await expect(row).not.toContainText("50.000,00");
  });

  test("4. Back from Income/Giving returns to correct tab on new account", async ({
    page,
  }) => {
    // Create an income entry
    await page.goto("/new/income");
    await page.getByPlaceholder("0.00").first().fill("200000");
    await page.getByLabel(/Source/i).fill("Consulting Gig");
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Clear active tab from storage to simulate fresh visit
    await page.evaluate(() => {
      sessionStorage.removeItem("moneymap_records_tab");
      localStorage.removeItem("moneymap_records_tab");
    });

    // Visit /records
    await page.goto("/records");
    await expect(page).toHaveURL(/\/records\?tab=income/);

    // Open entry detail
    const row = page.getByTestId("record-row").first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/\/records\/[a-f0-9-]+/);

    // Click back button
    const backBtn = page.getByTestId("record-detail-back-btn");
    await backBtn.click();

    // Verify user is back on Income tab, NOT Expenses
    await expect(page).toHaveURL(/\/records\?tab=income/);
    await expect(page.getByTestId("records-tab-income")).toHaveAttribute("aria-selected", "true");
  });
});
