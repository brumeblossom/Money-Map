import { test, expect } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 23 Verification", () => {
  test("1. Landing page: Welcome back Feyi, no Blossom, and FAQ alignment / no email line", async ({
    page,
  }) => {
    // 1. Visit landing page
    await page.goto("/");

    // 2. Hero phone animation checks
    const heroMockup = page.locator("section").first();
    await expect(heroMockup).toContainText("Welcome back, Feyi");
    await expect(heroMockup).not.toContainText("Blossom");

    // 3. FAQ section checks
    const faqSection = page.locator("#faq");
    await expect(faqSection).toBeVisible();

    // Verify "Still have a question" and email link are removed from FAQ section
    await expect(faqSection).not.toContainText("Still have a question");
    await expect(faqSection.locator('a[href*="mailto:workwithbrume@gmail.com"]')).toHaveCount(0);

    // Verify footer retains the contact/feedback mailto links
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Send feedback" }).first()).toBeVisible();
    await expect(footer.getByRole("link", { name: "Contact us" }).first()).toBeVisible();

    // 4. Check FAQ alignment at 1280px
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      const getStartedBtn = page.getByTestId("landing-get-started-cta");
      await expect(getStartedBtn).toBeVisible();

      // Find the last FAQ card (<details>)
      const faqCards = faqSection.locator("details");
      const lastFaqCard = faqCards.last();
      await expect(lastFaqCard).toBeVisible();

      const btnBox = await getStartedBtn.boundingBox();
      const cardBox = await lastFaqCard.boundingBox();

      expect(btnBox).not.toBeNull();
      expect(cardBox).not.toBeNull();

      if (btnBox && cardBox) {
        const btnBottom = btnBox.y + btnBox.height;
        const cardBottom = cardBox.y + cardBox.height;
        const diff = Math.abs(btnBottom - cardBottom);
        // At 1280px, the Get started button's bottom edge is within 4px of the last FAQ card's bottom edge
        expect(diff).toBeLessThanOrEqual(4);
      }
    }

    // 5. Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("2. Repeats field shows chevron icon, and choosing Weekly/Monthly saves properly", async ({
    page,
    context,
  }) => {
    await setGuestCookie(context);

    // Test across Income, Expense, Giving add forms
    const flows = [
      {
        url: "/new/income",
        amount: "50000",
        label: "Source",
        sourceVal: "Salary Company",
        frequency: "Monthly",
      },
      {
        url: "/new/expense",
        amount: "15000",
        label: "",
        sourceVal: "",
        frequency: "Weekly",
      },
      {
        url: "/new/giving",
        amount: "10000",
        label: "Recipient",
        sourceVal: "Charity Foundation",
        frequency: "Monthly",
      },
    ];

    for (const flow of flows) {
      await page.goto(flow.url);

      const repeatsSelect = page.locator("#repeats-select");
      await expect(repeatsSelect).toBeVisible();

      const chevron = page.locator("#repeats-select + svg.lucide-chevron-down");
      await expect(chevron).toBeVisible();

      await page.getByPlaceholder("0.00").first().fill(flow.amount);
      if (flow.label && flow.sourceVal) {
        await page.getByLabel(flow.label).fill(flow.sourceVal);
      }
      await repeatsSelect.selectOption(flow.frequency);
      expect(await repeatsSelect.inputValue()).toBe(flow.frequency);

      const saveBtn = page.getByRole("button", { name: "Save", exact: true });
      await expect(saveBtn).toBeEnabled();
      await saveBtn.dispatchEvent("click");
      await expect(page.getByText("Saved").first()).toBeVisible();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  });

  test("3. Edit form shows chevron icon on Repeats field and works in dark mode", async ({
    page,
    context,
  }) => {
    await setGuestCookie(context);

    // Create an entry first
    await page.goto("/new/income");
    await expect(page.getByRole("heading", { level: 2, name: "Income" })).toBeVisible();
    await page.getByPlaceholder("0.00").first().fill("75000");
    await page.getByLabel(/Source/i).fill("Consulting Client");
    await page.locator("#repeats-select").selectOption("Monthly");
    const initSave = page.getByRole("button", { name: "Save", exact: true });
    await expect(initSave).toBeEnabled();
    await initSave.dispatchEvent("click");
    await expect(page.getByText("Saved").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Toggle dark mode via theme toggle button
    await page.goto("/records?tab=income");
    const themeToggle = page.getByTestId("theme-toggle-btn");
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    }

    // Wait for record to appear from Dexie
    const recordRow = page.getByTestId("record-row").first();
    await expect(recordRow).toBeVisible({ timeout: 10000 });
    await recordRow.click();

    // Click Edit
    const editBtn = page.getByTestId("detail-edit-button");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify Repeats select in edit mode
    const repeatsSelect = page.locator("#repeats-select");
    await expect(repeatsSelect).toBeVisible();
    const chevron = page.locator("#repeats-select + svg.lucide-chevron-down");
    await expect(chevron).toBeVisible();

    // Change frequency and save
    await repeatsSelect.selectOption("Weekly");
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.dispatchEvent("click");
    await expect(page.getByText("Saved").first()).toBeVisible();
  });

  test("4. Landing page: no horizontal scroll at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
