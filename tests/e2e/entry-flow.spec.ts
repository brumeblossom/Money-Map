import { expect, test } from "@playwright/test";

test.describe("Entry Flow", () => {
  test.beforeEach(async () => {
    // Each Playwright test has its own isolated BrowserContext
  });

  test("save is disabled until required fields are valid and date displays DD-MM-YYYY", async ({
    page,
  }) => {
    await page.goto("/");

    // Open Money out
    const moneyOutCard = page.getByTestId("action-card-expense");
    await expect(moneyOutCard).toBeVisible();
    await moneyOutCard.click();

    // Check modal opened with Money out title
    await expect(page.getByRole("heading", { name: "Money out" })).toBeVisible();

    // Verify date is formatted as DD-MM-YYYY
    const dateInput = page.getByPlaceholder("DD-MM-YYYY");
    await expect(dateInput).toBeVisible();
    const dateVal = await dateInput.inputValue();
    expect(dateVal).toMatch(/^\d{2}-\d{2}-\d{4}$/);

    // Save button should be disabled because amount is 0
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeDisabled();

    // Enter amount 100
    const amountInput = page.getByPlaceholder("0.00");
    await amountInput.fill("100");

    // Save should now be enabled
    await expect(saveButton).toBeEnabled();
  });

  test("record 2,500 for Food in under 15s, toast appears, card shows ₦2,500.00, Undo removes it", async ({
    page,
  }) => {
    const startTime = Date.now();
    await page.goto("/");

    // Tap Money out card
    await page.getByTestId("action-card-expense").click();

    // Amount input is focused on open; enter 2500
    const amountInput = page.getByPlaceholder("0.00");
    await expect(amountInput).toBeVisible();
    await amountInput.fill("2500");

    // Choose Food from category picker
    const categorySelect = page.locator("select").first();
    await categorySelect.selectOption({ label: "Food" });

    // Click Save
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const elapsedTime = (Date.now() - startTime) / 1000;
    expect(elapsedTime).toBeLessThan(15); // Must complete in under 15 seconds

    // Wait for modal to close
    await expect(page.getByRole("heading", { name: "Money out" })).toBeHidden();
    await page.waitForURL("/");

    // Toast "Saved" appears with "Undo"
    const toastElement = page.getByText("Saved");
    await expect(toastElement).toBeVisible();
    const undoButton = page.getByRole("button", { name: "Undo" });
    await expect(undoButton).toBeVisible();

    // Money out card shows ₦2,500.00
    const moneyOutCard = page.getByTestId("action-card-expense");
    await expect(moneyOutCard).toContainText("₦2,500.00");

    // Strip also shows ₦2,500.00 for Money out
    await expect(page.getByTestId("month-strip-money-out")).toContainText("₦2,500.00");

    // Click Undo
    await undoButton.click();

    // Money out card reverts to ₦0.00
    await expect(moneyOutCard).toContainText("₦0.00");
    await expect(page.getByTestId("month-strip-money-out")).toContainText("₦0.00");
  });

  test("custom category flow ('Other') creates category and selects it next time", async ({
    page,
  }) => {
    await page.goto("/");

    // Open Money out
    await page.getByTestId("action-card-expense").click();
    await expect(page.getByRole("heading", { name: "Money out" })).toBeVisible();

    // Select "Other (type your own)"
    const categorySelect = page.locator("select").first();
    await categorySelect.selectOption({ label: "Other (type your own)" });

    // Category name input appears
    const customInput = page.getByPlaceholder("Type your category name");
    await expect(customInput).toBeVisible();

    // Enter custom category name
    const customCatName = "Snacks & Drinks";
    await customInput.fill(customCatName);

    // Enter amount
    const amountInput = page.getByPlaceholder("0.00");
    await amountInput.fill("1200");

    // Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for modal to close
    await expect(page.getByRole("heading", { name: "Money out" })).toBeHidden();
    await page.waitForURL("/");

    // Verify toast
    await expect(page.getByText("Saved")).toBeVisible();
    await expect(page.getByTestId("action-card-expense")).toContainText("₦1,200.00");

    // Re-open Money out
    await page.getByTestId("action-card-expense").click();
    await expect(page.getByRole("heading", { name: "Money out" })).toBeVisible();

    // Verify the newly created custom category is present in the options!
    const customOption = page.locator("select option", { hasText: customCatName });
    await expect(customOption).toBeAttached({ timeout: 10000 });
  });
});
