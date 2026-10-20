import { expect, test } from "@playwright/test";

test("home page shows Money Map", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Money Map" }),
  ).toBeVisible();
});
