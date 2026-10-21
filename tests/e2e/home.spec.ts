import { expect, test } from "@playwright/test";
import { setGuestCookie } from "./test-helpers";

test("home page shows heading and action cards", async ({ page, context }) => {
  await setGuestCookie(context);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "What are we recording today?" }),
  ).toBeVisible();
  await expect(page.getByText("Tap a card to add an entry")).toBeVisible();
});

