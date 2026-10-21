import type { BrowserContext } from "@playwright/test";

export async function setGuestCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "moneymap_guest",
      value: "true",
      domain: "localhost",
      path: "/",
    },
  ]);
}
