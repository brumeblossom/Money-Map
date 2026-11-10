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

export async function setTestAuthCookie(
  context: BrowserContext,
  userId: string = "77777777-7777-7777-7777-777777777777",
) {
  await context.addCookies([
    {
      name: "moneymap_mock_user",
      value: userId,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "moneymap_has_session",
      value: "1",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
