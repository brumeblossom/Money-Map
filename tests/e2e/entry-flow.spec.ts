import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Entry Flow", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
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

  // --------------------------------------------------------------------------
  // Tests for all 4 forms: Amount typing (2500 then 1234567.89), scrolling,
  // Save button visibility without scrolling, saving, and screenshot capture
  // --------------------------------------------------------------------------
  const forms = [
    { actionKey: "income", cardTestId: "action-card-income", title: "Money in" },
    { actionKey: "expense", cardTestId: "action-card-expense", title: "Money out" },
    { actionKey: "giving", cardTestId: "action-card-giving", title: "Giving" },
    { actionKey: "lent", cardTestId: "action-card-lent", title: "Money I lent" },
  ];

  for (const f of forms) {
    test(`form ${f.title}: types 2500 then 1234567.89, Save visible without scrolling, captures screenshot`, async ({
      page,
    }, testInfo) => {
      await page.goto("/");
      await page.getByTestId(f.cardTestId).click();

      // Heading is visible
      await expect(page.getByRole("heading", { name: f.title })).toBeVisible();

      // For Money in, verify Source (optional) is visible directly on form
      if (f.actionKey === "income") {
        await expect(page.getByLabel(/Source/i)).toBeVisible();
      }
      // For Giving, verify Recipient (optional) is visible directly on form
      if (f.actionKey === "giving") {
        await expect(page.getByLabel(/Recipient/i)).toBeVisible();
      }
      // For Lent, fill required Borrower
      if (f.actionKey === "lent") {
        await expect(page.getByLabel(/Borrower/i)).toBeVisible();
        await page.getByPlaceholder("Who did you lend to?").fill("Emeka");
      }

      // Find amount input
      const amountInput = page.getByPlaceholder("0.00").first();
      await expect(amountInput).toBeVisible();

      // Type 2500 and verify accepted
      await amountInput.fill("2500");
      expect(await amountInput.inputValue()).toBe("2500");

      // Type 1234567.89 and verify accepted
      await amountInput.fill("1234567.89");
      expect(await amountInput.inputValue()).toBe("1234567.89");

      // Save button is visible in sticky footer WITHOUT scrolling
      const saveButton = page.getByRole("button", { name: "Save", exact: true });
      await expect(saveButton).toBeVisible();

      // Scroll to the last field (Description)
      const descriptionField = page.getByLabel(/Description/i);
      await descriptionField.scrollIntoViewIfNeeded();
      await expect(descriptionField).toBeVisible();

      // Save button remains visible while scrolled to bottom
      await expect(saveButton).toBeVisible();

      // Capture screenshot
      const projectName = testInfo.project.name;
      await page.screenshot({
        path: `tests/e2e/screenshots/form-${f.actionKey}-${projectName}.png`,
      });

      // Save and verify toast
      await saveButton.click();
      await expect(page.getByText("Saved")).toBeVisible();
    });
  }

  test("Money I lent: save updates card total and Undo reverts it", async ({
    page,
  }) => {
    await page.goto("/");

    // Open Money I lent
    await page.getByTestId("action-card-lent").click();
    await expect(page.getByRole("heading", { name: "Money I lent" })).toBeVisible();

    // Fill Borrower
    await page.getByPlaceholder("Who did you lend to?").fill("Ada");

    // Fill Amount lent
    const amountInput = page.getByPlaceholder("0.00").first();
    await amountInput.fill("50000");

    // Save
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Toast appears
    await expect(page.getByText("Saved")).toBeVisible();
    const undoButton = page.getByRole("button", { name: "Undo" });
    await expect(undoButton).toBeVisible();

    // Lent card shows ₦50,000.00
    const lentCard = page.getByTestId("action-card-lent");
    await expect(lentCard).toContainText("₦50,000.00");

    // Undo removes it
    await undoButton.click();
    await expect(lentCard).toContainText("₦0.00");
  });

  test("phone at 360px wide: no field is cut off (no horizontal scrollbar)", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "phone") return;

    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    for (const f of forms) {
      await page.getByTestId(f.cardTestId).click();
      await expect(page.getByRole("heading", { name: f.title })).toBeVisible();

      // Verify no horizontal document overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Close modal
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("heading", { name: f.title })).toBeHidden();
    }
  });

  test("desktop dialog height is at most 640px and page behind is visible", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "desktop") return;

    await page.goto("/");
    await page.getByTestId("action-card-lent").click();
    await expect(page.getByRole("heading", { name: "Money I lent" })).toBeVisible();

    const dialog = page.locator("[data-slot='dialog-content']");
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeLessThanOrEqual(640);
    }

    // Verify background overlay exists and page behind is present
    await expect(page.locator("[data-slot='dialog-overlay']")).toBeVisible();
    await expect(page.getByText("What are we recording today?")).toBeAttached();
  });
});
