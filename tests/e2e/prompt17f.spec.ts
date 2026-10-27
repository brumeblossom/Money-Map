import { test, expect } from "@playwright/test";

test.describe("Prompt 17f: Landing Page Polish & Password Auth / Sign-Out", () => {
  test.describe.configure({ mode: "serial" });

  test("1. signed-out visit to '/' shows the landing page", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");

    // Proves landing page is shown
    await expect(page.getByRole("heading", { name: /Know where your/i })).toBeVisible();
    await expect(page.getByTestId("landing-get-started-hero")).toBeVisible();
    await expect(page.getByTestId("landing-phone-mockup")).toBeVisible();
    await expect(page.getByText("Start mapping your money today.")).toBeVisible();
  });

  test("2. guest visit to '/' shows Home", async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: "moneymap_guest", value: "true", domain: "localhost", path: "/" },
      { name: "mm_guest", value: "1", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();
  });

  test("3. signed-in visit to '/' shows Home", async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: "moneymap_mock_user", value: "test-authed-user-17f", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("heading", { name: "What are we recording today?" })).toBeVisible();
  });

  test("4. after sign-out '/' shows the landing page (not an empty Home)", async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: "moneymap_mock_user", value: "test-authed-user-17f", domain: "localhost", path: "/" },
      { name: "moneymap_has_session", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Trigger Sign out
    const signOutBtn = page.getByRole("button", { name: /^Sign out$/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Confirm in modal
    const confirmBtn = page.getByTestId("confirm-signout-btn");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // After sign-out, navigates to "/" and landing page is shown
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("heading", { name: /Know where your/i })).toBeVisible();
    await expect(page.getByTestId("landing-get-started-hero")).toBeVisible();

    // Verify guest cookies are gone
    const cookies = await context.cookies();
    const guestCookie = cookies.find((c) => c.name === "moneymap_guest" && c.value === "true");
    const mmGuestCookie = cookies.find((c) => c.name === "mm_guest" && c.value === "1");
    expect(guestCookie).toBeUndefined();
    expect(mmGuestCookie).toBeUndefined();
  });

  test("5. the sign-in card has no first-name field and no back arrow inside card", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/welcome?mode=signin");

    // Title and elements
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByText("Sign in to your Money Map")).toBeVisible();
    await expect(page.getByTestId("welcome-google")).toBeVisible();
    await expect(page.getByTestId("welcome-email-input")).toBeVisible();
    await expect(page.getByTestId("welcome-password-input")).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByTestId("welcome-signin-submit")).toBeVisible();

    // Proves NO first-name field
    await expect(page.getByTestId("welcome-first-name-input")).not.toBeVisible();

    // Proves NO back arrow button inside the card (only the small link above the card)
    await expect(page.getByTestId("welcome-back-home")).toBeVisible();
    const backButtonsInsideCard = page.locator(".bg-card").getByRole("button", { name: /back/i });
    await expect(backButtonsInsideCard).toHaveCount(0);
  });

  test("6. sign-up shows the check-email card after creating account", async ({ page, context }) => {
    await context.clearCookies();

    // Intercept Supabase signup request
    await page.route("**/auth/v1/signup*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: "adanna@example.com",
            identities: [{ id: "identity-1" }],
          },
        }),
      });
    });

    await page.goto("/welcome?mode=signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    await page.getByTestId("welcome-first-name-input").fill("Adanna");
    await page.getByTestId("welcome-email-input").fill("adanna@example.com");
    await page.getByTestId("welcome-password-input").fill("Password1");

    await expect(page.getByTestId("welcome-signup-submit")).toBeEnabled();
    await page.getByTestId("welcome-signup-submit").click();

    // Proves check-email card is shown
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText("adanna@example.com")).toBeVisible();
    await expect(page.getByTestId("auth-resend-button")).toBeVisible();
    await expect(page.getByRole("button", { name: /Use a different email/i })).toBeVisible();
  });

  test("7. password checklist updates as you type and blocks weak passwords ('password' and 'PASSWORD1' fail, 'Password1' passes)", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/welcome?mode=signup");

    const pwdInput = page.getByTestId("welcome-password-input");
    const submitBtn = page.getByTestId("welcome-signup-submit");

    await page.getByTestId("welcome-first-name-input").fill("Chinedu");
    await page.getByTestId("welcome-email-input").fill("chinedu@example.com");

    // 1. Weak password: "password" (missing uppercase, number)
    await pwdInput.fill("password");
    await expect(page.getByTestId("password-rule-minLength")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasUppercase")).toHaveAttribute("data-met", "false");
    await expect(page.getByTestId("password-rule-hasLowercase")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasNumber")).toHaveAttribute("data-met", "false");
    await expect(submitBtn).toBeDisabled();

    // 2. Weak password: "PASSWORD1" (missing lowercase)
    await pwdInput.fill("PASSWORD1");
    await expect(page.getByTestId("password-rule-minLength")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasUppercase")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasLowercase")).toHaveAttribute("data-met", "false");
    await expect(page.getByTestId("password-rule-hasNumber")).toHaveAttribute("data-met", "true");
    await expect(submitBtn).toBeDisabled();

    // 3. Valid password: "Password1" (all 4 pass)
    await pwdInput.fill("Password1");
    await expect(page.getByTestId("password-rule-minLength")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasUppercase")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasLowercase")).toHaveAttribute("data-met", "true");
    await expect(page.getByTestId("password-rule-hasNumber")).toHaveAttribute("data-met", "true");
    await expect(submitBtn).toBeEnabled();
  });

  test("8. landing page at 360px wide has no horizontal scroll, the heading is two lines and the hero buttons are stacked", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    // Heading has two lines via the br on mobile
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.innerText();
    expect(headingText).toContain("Know where your\nmoney goes.");

    // Hero buttons are stacked
    const primaryHeroBtn = page.getByTestId("landing-get-started-hero");
    const secondaryHeroBtn = page.getByTestId("landing-signin-hero");
    await expect(primaryHeroBtn).toBeVisible();
    await expect(secondaryHeroBtn).toBeVisible();

    const boxPrimary = await primaryHeroBtn.boundingBox();
    const boxSecondary = await secondaryHeroBtn.boundingBox();
    expect(boxPrimary).not.toBeNull();
    expect(boxSecondary).not.toBeNull();
    if (boxPrimary && boxSecondary) {
      // Primary is above secondary
      expect(boxPrimary.y + boxPrimary.height).toBeLessThanOrEqual(boxSecondary.y + 2);
      // Both buttons are 48px high on phones
      expect(Math.round(boxPrimary.height)).toBe(48);
      expect(Math.round(boxSecondary.height)).toBe(48);
    }

    // Phone mockup has only one floating card on phones (Salary)
    await expect(page.getByTestId("floating-card-salary")).toBeVisible();
    await expect(page.getByTestId("floating-card-ada")).not.toBeVisible();

    // Proves NO horizontal scroll at 360px width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
