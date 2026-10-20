import { expect, test } from "@playwright/test";

test("home page shows heading and action cards", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "What are we recording today?" }),
  ).toBeVisible();
  await expect(page.getByText("Tap a card to add an entry")).toBeVisible();
});
