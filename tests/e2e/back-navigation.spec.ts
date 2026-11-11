import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Back Navigation Across the App (Prompt 17i)", () => {
  test.beforeEach(async ({ context }) => {
    await setGuestCookie(context);
  });

  test("Flow 1: Records list -> pencil (edit) -> back arrow / Cancel / Save -> Records list", async ({
    page,
  }) => {
    // 1. Create an expense entry
    await page.goto("/new/expense");
    await expect(page.getByRole("heading", { level: 2, name: "Expenses" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("25000");
    await page.getByLabel(/Description/i).fill("Groceries Trip");
    const saveNewBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveNewBtn).toBeEnabled();
    await saveNewBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // 2. Go to Records list and switch to Expenses tab
    await page.goto("/records?tab=expenses");
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();
    const row = page.getByTestId("record-row").first();
    await expect(row).toBeVisible();

    const triggerEdit = async () => {
      const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
      if (isDesktop) {
        await page.getByRole("button", { name: "Edit entry" }).first().click();
      } else {
        await row.locator("div.relative.z-10").evaluate((el) => {
          const touchStart = new Touch({
            identifier: 1,
            target: el,
            clientX: 280,
            clientY: 100,
          });
          const touchEnd = new Touch({
            identifier: 1,
            target: el,
            clientX: 100,
            clientY: 100,
          });
          el.dispatchEvent(
            new TouchEvent("touchstart", {
              bubbles: true,
              cancelable: true,
              touches: [touchStart],
              targetTouches: [touchStart],
              changedTouches: [touchStart],
            }),
          );
          el.dispatchEvent(
            new TouchEvent("touchend", {
              bubbles: true,
              cancelable: true,
              touches: [],
              targetTouches: [],
              changedTouches: [touchEnd],
            }),
          );
        });
        await row.getByTestId("swipe-edit").click();
      }
    };

    // 3. Open edit page
    await triggerEdit();
    await expect(page).toHaveURL(/\/records\/.*\/edit\?from=/);

    // Verify back-link text is "Records"
    const backBtn = page.getByTestId("edit-record-back-btn");
    await expect(backBtn).toBeVisible();
    await expect(backBtn).toContainText("Records");

    // 4. Test Back Arrow returns to Records list (Expenses tab)
    await backBtn.click();
    await expect(page).toHaveURL(/\/records\?tab=expenses/);
    await expect(page.getByTestId("records-tab-expenses")).toBeVisible();

    // 5. Click edit again -> click Cancel button
    await triggerEdit();
    await expect(page).toHaveURL(/\/records\/.*\/edit/);
    await page.getByRole("button", { name: "Cancel" }).click({ force: true });
    await expect(page).toHaveURL(/\/records\?tab=expenses/);

    // 6. Click edit again -> modify description -> Save -> returns to Records list
    await triggerEdit();
    await expect(page).toHaveURL(/\/records\/.*\/edit/);
    await page.getByLabel(/Description/i).fill("Supermarket Groceries");
    const saveEditBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveEditBtn).toBeEnabled();
    await saveEditBtn.click({ force: true });
    await expect(page).toHaveURL(/\/records\?tab=expenses/);
    await expect(page.getByTestId("record-row").first()).toContainText("Supermarket Groceries");
  });

  test("Flow 2 & 3: Records list -> entry detail -> Edit -> Save -> detail -> back -> Records list (no loop)", async ({
    page,
  }) => {
    // 1. Create an income entry
    await page.goto("/new/income");
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("150000");
    await page.getByLabel(/Source/i).fill("Freelance Client");
    const saveNewBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveNewBtn).toBeEnabled();
    await saveNewBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // 2. Go to Records list (Income tab)
    await page.goto("/records?tab=income");
    await expect(page.getByTestId("record-row")).toHaveCount(1);

    // 3. Flow 2: Click entry row to view details
    await page.getByTestId("record-row").first().click();
    await expect(page).toHaveURL(/\/records\/[^/]+(\?from=.*)?$/);
    const detailBackBtn = page.getByTestId("record-detail-back-btn");
    await expect(detailBackBtn).toBeVisible();
    await expect(detailBackBtn).toContainText("Records");

    // 4. Flow 3: From detail, click Edit
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/records\/.*\/edit\?from=/);

    // Verify back-link text in edit is "Entry" because it came from detail
    const editBackLink = page.getByTestId("edit-record-back-btn");
    await expect(editBackLink).toBeVisible();
    await expect(editBackLink).toContainText("Entry");

    // Save the edit
    await page.getByLabel(/Source/i).fill("Freelance Client Updated");
    const saveEditBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveEditBtn).toBeEnabled();
    await saveEditBtn.click({ force: true });

    // Should return to entry detail
    await expect(page).toHaveURL(/\/records\/[^/]+(\?from=.*)?$/);
    await expect(page.getByText("Freelance Client Updated").first()).toBeVisible();

    // Now clicking Back on detail must return to Records list, NOT the edit form!
    await page.getByTestId("record-detail-back-btn").click();
    await expect(page).toHaveURL(/\/records\?tab=income/);
  });

  test("Flow 4: Entry detail -> Delete (confirmed) -> Records list (replace; Back does not reopen)", async ({
    page,
  }) => {
    // 1. Create an entry to delete
    await page.goto("/new/income");
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("45000");
    await page.getByLabel(/Source/i).fill("To Be Deleted");
    const saveNewBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveNewBtn).toBeEnabled();
    await saveNewBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // 2. Open records list and navigate to entry detail
    await page.goto("/records?tab=income");
    await page.getByTestId("record-row").first().click();
    await expect(page).toHaveURL(/\/records\/[a-f0-9-]+/);

    // 3. Click Delete and confirm
    await page.getByRole("button", { name: "Delete" }).click();
    const deleteModal = page.getByText("Delete this entry?");
    await expect(deleteModal).toBeVisible();
    const confirmBtn = page.locator("button.bg-destructive, button:has-text('Delete')").last();
    await confirmBtn.click();

    // 4. Lands on Records list
    await expect(page).toHaveURL(/\/records\?tab=income/);

    // 5. Browser Back button must not reopen the deleted item
    await page.goBack();
    expect(page.url()).not.toContain("/records/");
  });

  test("Flow 5: Home cards -> form -> Cancel/Save -> Home (same / saved month)", async ({
    page,
  }) => {
    // 1. Visit Home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();

    // 2. Click Income action card
    await page.getByRole("link", { name: /^Income,/ }).first().click();
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();

    // Cancel closes the modal and stays on Home
    const cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });
    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();

    // 3. Click Income action card again and Save
    await page.getByRole("link", { name: /^Income,/ }).first().click();
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("18000");
    await page.getByLabel(/Source/i).fill("Home Card Save");
    const saveHomeBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveHomeBtn).toBeEnabled();
    await saveHomeBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();
  });

  test("Flow 7: Lent flow navigation (Records Lent -> loan detail -> back, and Delete loan)", async ({
    page,
  }) => {
    // 1. Create a loan
    await page.goto("/new/lent");
    await expect(page.getByRole("heading", { name: "Money I lent" })).toBeVisible();
    await page.getByPlaceholder("Who did you lend to?").fill("Bimbo");
    await page.getByPlaceholder("0.00").first().fill("60000");
    await page.getByLabel("Expected back by").fill("25-12-2026");
    const saveLentBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveLentBtn).toBeEnabled();
    await saveLentBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // 2. Go to Records "Lent" tab
    await page.goto("/records?tab=lent");
    await expect(page.getByTestId("records-tab-lent")).toBeVisible();
    await expect(page.getByTestId("loan-row")).toHaveCount(1);

    // 3. Click loan to open loan detail
    await page.getByTestId("loan-row").first().click();
    await expect(page).toHaveURL(/\/lent\/[a-f0-9-]+/);

    // Verify back button says "Money I lent"
    const backBtn = page.getByTestId("loan-back-button");
    await expect(backBtn).toBeVisible();
    await expect(backBtn).toContainText("Money I lent");

    // Click back -> returns to Records Lent tab
    await backBtn.click();
    await expect(page).toHaveURL(/\/records\?tab=lent/);

    // 4. Delete loan flow: open loan detail again
    await page.getByTestId("loan-row").first().click();
    await expect(page).toHaveURL(/\/lent\/[a-f0-9-]+/);
    await page.getByRole("button", { name: "Delete" }).click();
    const deleteModal = page.getByText("Delete loan?");
    await expect(deleteModal).toBeVisible();
    const confirmDeleteBtn = page.locator("button.bg-destructive, button:has-text('Delete')").last();
    await confirmDeleteBtn.click();

    // Returns to Records Lent tab
    await expect(page).toHaveURL(/\/records\?tab=lent/);
  });

  test("Flow 10: Direct page access (no from query) falls back to defaults", async ({
    page,
  }) => {
    // 1. Create an entry so we have an ID
    await page.goto("/new/income");
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("70000");
    await page.getByLabel(/Source/i).fill("Direct Link Test");
    const saveDirectBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveDirectBtn).toBeEnabled();
    await saveDirectBtn.click({ force: true });
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/records?tab=income");
    const row = page.getByTestId("record-row").first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/\/records\/[a-f0-9-]+/);
    const entryUrl = page.url();
    const entryId = entryUrl.split("/records/")[1]?.split("?")[0];

    // Direct visit to /records/[id] with NO 'from' parameter
    await page.goto(`/records/${entryId}`);
    const detailBack = page.getByTestId("record-detail-back-btn");
    await expect(detailBack).toBeVisible();
    await expect(detailBack).toContainText("Records");
    await detailBack.click();
    await expect(page).toHaveURL(/\/records\?tab=income/);

    // Direct visit to /records/[id]/edit with NO 'from' parameter
    await page.goto(`/records/${entryId}/edit`);
    const editBack = page.getByTestId("edit-record-back-btn");
    await expect(editBack).toBeVisible();
    await expect(editBack).toContainText("Records");
    await editBack.click();
    await expect(page).toHaveURL(/\/records\?tab=income/);

    // Direct visit to /export with NO 'from' parameter
    await page.goto("/export");
    const exportBack = page.getByTestId("export-back-btn");
    await expect(exportBack).toBeVisible();
    await expect(exportBack).toContainText("Records");
    await exportBack.click();
    await expect(page).toHaveURL(/\/records/);

    // Direct visit to /settings/repeating with NO 'from' parameter
    await page.goto("/settings/repeating");
    const repeatingBack = page.getByTestId("repeating-back-btn");
    await expect(repeatingBack).toBeVisible();
    await expect(repeatingBack).toContainText("Settings");
    await repeatingBack.click();
    await expect(page).toHaveURL(/\/settings/);

    // Direct visit to /settings/categories with NO 'from' parameter
    await page.goto("/settings/categories");
    const categoriesBack = page.getByTestId("categories-back-btn");
    await expect(categoriesBack).toBeVisible();
    await expect(categoriesBack).toContainText("Settings");
    await categoriesBack.click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
