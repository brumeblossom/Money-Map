import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Money I Lent Flow (Prompt 7)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("full lend flow: Ada ₦50k over 2 months @ 10%, repayments, paid off, home strip unaffected", async ({
    page,
  }) => {
    // Format helpers
    const now = new Date();
    const twoMonthsLater = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
    const twoMonthsDD = String(twoMonthsLater.getDate()).padStart(2, "0");
    const twoMonthsMM = String(twoMonthsLater.getMonth() + 1).padStart(2, "0");
    const twoMonthsYYYY = twoMonthsLater.getFullYear();
    const twoMonthsFormatted = `${twoMonthsDD}-${twoMonthsMM}-${twoMonthsYYYY}`;

    // 1. Visit Home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();

    // Verify initial home strip values
    const monthStrip = page.getByTestId("this-month-strip");
    await expect(monthStrip).toContainText("₦0.00");

    // Initial Money I lent card
    const lentCard = page.getByTestId("action-card-lent");
    await expect(lentCard).toContainText("₦0.00");

    // 2. Open Money I lent form
    await lentCard.click();
    await expect(page.getByRole("heading", { name: "Money I lent" })).toBeVisible();

    // Fill Borrower: "Ada"
    const borrowerInput = page.getByPlaceholder("Who did you lend to?");
    await borrowerInput.fill("Ada");

    // Fill Amount lent: ₦50,000
    const amountInput = page.getByPlaceholder("0.00").first();
    await amountInput.fill("50000");

    // Fill Expected back by: 2 months from today
    const expectedBackInput = page.getByLabel("Expected back by");
    await expectedBackInput.fill(twoMonthsFormatted);

    // Payback plan: Monthly
    const planSelect = page.getByLabel(/Payback plan/i);
    await planSelect.selectOption("monthly");

    // Interest: Percent (%) -> 10%
    const percentButton = page.getByRole("button", { name: /percent/i });
    await percentButton.click();

    const interestInput = page.getByPlaceholder("e.g. 5");
    await interestInput.fill("10");

    // Verify suggested instalment calculated: ₦27,500.00
    // Total to get back = 50,000 + 10% = 55,000. Suggested = 55,000 / 2 = 27,500.
    const instalmentField = page.getByLabel(/Instalment amount/i);
    await expect(instalmentField).toBeVisible();
    await expect(instalmentField).toHaveValue("27,500.00");

    // Click Save
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Toast appears
    await expect(page.getByText("Saved").first()).toBeVisible();

    // 3. Verify Home Screen:
    // - Money I lent card shows total balance left ₦55,000.00
    await expect(lentCard).toContainText("₦55,000.00");

    // - Money lent does not change Money in, Money out or Left over on Home
    await expect(monthStrip).toContainText("₦0.00");

    // 4. Navigate to /lent
    await page.goto("/lent");
    await expect(page.getByRole("heading", { name: "Money I lent" }).first()).toBeVisible();

    // Row for "Ada" is present
    const adaRow = page.locator('[data-testid="loan-row"]', { hasText: "Ada" });
    await expect(adaRow).toBeVisible();
    await expect(adaRow).toContainText("Ada");
    await expect(adaRow).toContainText("₦55,000.00");

    // Click on Ada's link to view loan detail /lent/[id]
    await adaRow.locator("a").first().click();
    await page.waitForURL(/\/lent\/[a-f0-9-]+/);
    await expect(page.getByRole("heading", { name: "Ada" })).toBeVisible();

    // Verify summary values
    await expect(page.getByText("Total to get back")).toBeVisible();
    await expect(page.locator("text=₦55,000.00").first()).toBeVisible();
    await expect(page.getByText("Received so far")).toBeVisible();
    await expect(page.locator("text=₦0.00").first()).toBeVisible();
    await expect(page.getByText("Balance left").first()).toBeVisible();

    // Verify instalment timeline shows 2 instalments of ₦27,500.00
    await expect(page.getByText("Instalment 1 of 2")).toBeVisible();
    await expect(page.getByText("Instalment 2 of 2")).toBeVisible();

    // 5. Record first repayment of ₦27,500
    const recordButton = page.getByRole("button", { name: "Record money received" }).first();
    await recordButton.click();

    // Modal opens
    await expect(page.getByRole("heading", { name: "Record money received" })).toBeVisible();

    const paymentAmountInput = page.getByPlaceholder("0.00").first();
    await paymentAmountInput.fill("27500");

    const paymentNoteInput = page.getByPlaceholder(/First instalment/i);
    await paymentNoteInput.fill("First repayment");

    const paymentSaveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(paymentSaveButton).toBeEnabled();
    await paymentSaveButton.click();

    // Toast "Saved"
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Verify updated summary: Received so far = ₦27,500.00, Balance left = ₦27,500.00
    await expect(page.locator("text=₦27,500.00").first()).toBeVisible();
    await expect(page.getByText("50%")).toBeVisible();

    // Verify money received list shows the payment
    await expect(page.getByText("+₦27,500.00")).toBeVisible();
    await expect(page.getByText("First repayment")).toBeVisible();

    // 6. Test Overpayment warning on second repayment
    await recordButton.click();
    await expect(page.getByRole("heading", { name: "Record money received" })).toBeVisible();

    // Enter 30000 (which exceeds the ₦27,500.00 balance left)
    const paymentAmountInput2 = page.getByPlaceholder("0.00").first();
    await paymentAmountInput2.fill("30000");

    // Check overpayment warning
    const warning = page.getByTestId("overpayment-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText("This is more than the ₦27,500.00 left. Save anyway?");

    // Change to exact remaining 27500
    await paymentAmountInput2.fill("27500");
    await expect(warning).not.toBeVisible();

    // Save second repayment
    const paymentSaveButton2 = page.getByRole("button", { name: "Save", exact: true });
    await paymentSaveButton2.click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Verify status is now Paid off!
    await expect(page.locator("text=₦0.00").first()).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
    const paidOffBadge = page.locator("text=Paid off").first();
    await expect(paidOffBadge).toBeVisible();

    // 7. Return to /lent: Ada has moved to the "Paid off" section
    await page.goto("/lent");
    await expect(page.getByRole("heading", { name: "Money I lent" }).first()).toBeVisible();

    // Active loans should not contain Ada
    const paidOffSectionButton = page.getByRole("button", { name: /Paid off/i });
    await expect(paidOffSectionButton).toBeVisible();

    // Expand Paid off section
    await paidOffSectionButton.click();
    const paidOffAdaRow = page.locator('[data-testid="loan-row"]', { hasText: "Ada" });
    await expect(paidOffAdaRow).toBeVisible();
    await expect(paidOffAdaRow.locator('[data-testid="loan-status-badge"]')).toHaveText("Paid off");

    // 8. Return to Home: Lent card shows ₦0.00, month strip still shows ₦0.00
    await page.goto("/");
    await expect(lentCard).toContainText("₦0.00");
    await expect(monthStrip).toContainText("₦0.00");
  });

  test("a loan expected back 3 days from today shows 'Due soon'", async ({ page }) => {
    // 3 days from today
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dd = String(threeDaysLater.getDate()).padStart(2, "0");
    const mm = String(threeDaysLater.getMonth() + 1).padStart(2, "0");
    const yyyy = threeDaysLater.getFullYear();
    const threeDaysFormatted = `${dd}-${mm}-${yyyy}`;

    await page.goto("/new/lent");
    await expect(page.getByRole("heading", { name: "Money I lent" })).toBeVisible();

    await page.getByPlaceholder("Who did you lend to?").fill("Bisi");
    await page.getByPlaceholder("0.00").first().fill("20000");

    const expectedBackInput = page.getByLabel("Expected back by");
    await expectedBackInput.fill(threeDaysFormatted);

    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText("Saved").first()).toBeVisible();

    // Go to /lent
    await page.goto("/lent");
    const bisiRow = page.locator('[data-testid="loan-row"]', { hasText: "Bisi" });
    await expect(bisiRow).toBeVisible();

    // Status badge is "Due soon"
    const badge = bisiRow.locator('[data-testid="loan-status-badge"]');
    await expect(badge).toHaveText("Due soon");

    // Countdown text shows "Due in 3 days"
    await expect(bisiRow).toContainText("Due in 3 days");
  });

  test("edit and delete for loans and received payments with soft delete and undo", async ({
    page,
  }) => {
    // 1. Create a loan to "Chidi"
    await page.goto("/new/lent");
    await page.getByPlaceholder("Who did you lend to?").fill("Chidi");
    await page.getByPlaceholder("0.00").first().fill("15000");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Go to /lent
    await page.goto("/lent");
    const chidiRow = page.locator('[data-testid="loan-row"]', { hasText: "Chidi" });
    await expect(chidiRow).toBeVisible();

    // 2. Edit loan: click edit button
    const editLoanButton = chidiRow.getByRole("button", { name: "Edit loan" });
    await editLoanButton.click();

    await expect(page.getByRole("heading", { name: "Edit loan" })).toBeVisible();
    const borrowerInput = page.locator("#edit-borrower");
    await borrowerInput.fill("Chidi Obi");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    // Verify row updated to "Chidi Obi"
    await expect(page.locator('[data-testid="loan-row"]', { hasText: "Chidi Obi" })).toBeVisible();

    // 3. Open loan detail
    await page.locator('[data-testid="loan-row"]', { hasText: "Chidi Obi" }).click();
    await page.waitForURL(/\/lent\/[a-f0-9-]+/);
    await expect(page.getByRole("heading", { name: "Chidi Obi" })).toBeVisible();

    // Record a payment
    await page.getByRole("button", { name: "Record money received" }).first().click();
    await page.getByPlaceholder("0.00").first().fill("5000");
    await page.getByPlaceholder(/First instalment/i).fill("Test note");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();

    await expect(page.getByText("+₦5,000.00")).toBeVisible();
    await expect(page.getByText("Test note")).toBeVisible();

    // Edit payment
    const editPaymentButton = page.getByRole("button", { name: "Edit payment" });
    await editPaymentButton.click();
    await expect(page.getByRole("heading", { name: "Edit money received" })).toBeVisible();
    await page.getByPlaceholder(/First instalment/i).fill("Updated note");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByText("Updated note")).toBeVisible();

    // Delete payment
    const deletePaymentButton = page.getByRole("button", { name: "Delete payment" });
    await deletePaymentButton.click();
    await expect(page.getByText("Payment deleted")).toBeVisible();
    await expect(page.getByText("+₦5,000.00")).not.toBeVisible();

    // Undo delete payment
    const undoButton = page.getByRole("listitem").filter({ hasText: "Payment deleted" }).getByRole("button", { name: "Undo" });
    await undoButton.click();
    await expect(page.getByText("+₦5,000.00")).toBeVisible();

    // 4. Delete loan
    page.once("dialog", (dialog) => dialog.accept());
    const deleteLoanButton = page.getByRole("button", { name: "Delete", exact: true });
    await deleteLoanButton.click();

    // Should redirect to /lent
    await page.waitForURL("/lent");
    await expect(page.getByText("Loan deleted")).toBeVisible();
    await expect(page.locator('[data-testid="loan-row"]', { hasText: "Chidi Obi" })).not.toBeVisible();

    // Undo delete loan
    const undoLoanButton = page.getByRole("listitem").filter({ hasText: "Loan deleted" }).getByRole("button", { name: "Undo" });
    await undoLoanButton.click();
    await expect(page.locator('[data-testid="loan-row"]', { hasText: "Chidi Obi" })).toBeVisible();
  });
});
