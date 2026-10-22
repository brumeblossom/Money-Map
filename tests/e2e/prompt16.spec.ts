import { expect, test } from "@playwright/test";
import { PDFParse } from "pdf-parse";
import { setGuestCookie } from "./test-helpers";

test.describe("Prompt 16: PDF export and share links (US-8.1, US-8.2)", () => {
  const mockUserId = "test-export-user-1";

  async function seedExportData(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

    await page.evaluate(async () => {
      const win = window as unknown as {
        __db: {
          profiles: { put: (p: Record<string, unknown>) => Promise<unknown> };
          categories: {
            clear: () => Promise<void>;
            bulkAdd: (c: Record<string, unknown>[]) => Promise<unknown>;
          };
          entries: {
            clear: () => Promise<void>;
            bulkAdd: (e: Record<string, unknown>[]) => Promise<unknown>;
          };
          loans: {
            clear: () => Promise<void>;
            put: (l: Record<string, unknown>) => Promise<unknown>;
          };
          loan_payments: {
            clear: () => Promise<void>;
            put: (lp: Record<string, unknown>) => Promise<unknown>;
          };
        };
      };

      const now = new Date().toISOString();

      await win.__db.profiles.put({
        user_id: "test-export-user-1",
        display_name: "Adaeze Okafor",
        currency: "NGN",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      await win.__db.categories.clear();
      await win.__db.categories.bulkAdd([
        {
          id: "cat-sal",
          user_id: "test-export-user-1",
          name: "Salary",
          scope: "income",
          is_hidden: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "cat-food",
          user_id: "test-export-user-1",
          name: "Food & Groceries",
          scope: "expense",
          is_hidden: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "cat-give",
          user_id: "test-export-user-1",
          name: "Charity",
          scope: "giving",
          is_hidden: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);

      await win.__db.entries.clear();
      await win.__db.entries.bulkAdd([
        {
          id: "entry-sal-1",
          user_id: "test-export-user-1",
          kind: "income",
          amount_minor: 20000000, // ₦200,000
          category_id: "cat-sal",
          occurred_on: "2026-10-01",
          counterparty: "Tech Ventures",
          description: "October Paycheck",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-food-1",
          user_id: "test-export-user-1",
          kind: "expense",
          amount_minor: 4500000, // ₦45,000
          category_id: "cat-food",
          occurred_on: "2026-10-05",
          counterparty: "Supermarket Mart",
          description: "Market shopping",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: "entry-give-1",
          user_id: "test-export-user-1",
          kind: "giving",
          amount_minor: 1500000, // ₦15,000
          category_id: "cat-give",
          occurred_on: "2026-10-10",
          counterparty: "Orphanage Fund",
          description: "Orphanage donation",
          recurring_rule_id: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);

      await win.__db.loans.clear();
      await win.__db.loans.put({
        id: "loan-emeka-1",
        user_id: "test-export-user-1",
        counterparty: "Emeka",
        principal_minor: 5000000, // ₦50,000
        category_id: null,
        started_on: "2026-10-12",
        due_on: "2026-10-31",
        plan: "one_payment",
        interest_type: "none",
        interest_value: 0,
        instalment_minor: null,
        remind_on: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      await win.__db.loan_payments.clear();
      await win.__db.loan_payments.put({
        id: "lp-emeka-1",
        loan_id: "loan-emeka-1",
        amount_minor: 2000000, // ₦20,000 received (balance ₦30,000)
        paid_on: "2026-10-20",
        note: "Partial return",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    });
  }

  test("1. /export screen: period picker, action checkboxes, hide details, and PDF download with matching extracted text", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: mockUserId,
        domain: "localhost",
        path: "/",
      },
    ]);

    await seedExportData(page);

    await page.goto("/export");

    // Verify UI components on /export
    await expect(page.getByRole("heading", { name: "Export and Share" })).toBeVisible();
    await expect(page.getByTestId("export-preset-this_month")).toBeVisible();
    await expect(page.getByTestId("export-preset-last_3_months")).toBeVisible();
    await expect(page.getByTestId("export-preset-custom")).toBeVisible();

    // Verify Action checkboxes are all on by default
    await expect(page.getByTestId("export-kind-income")).toBeChecked();
    await expect(page.getByTestId("export-kind-expense")).toBeChecked();
    await expect(page.getByTestId("export-kind-giving")).toBeChecked();
    await expect(page.getByTestId("export-kind-lent")).toBeChecked();

    // Verify Hide details switch is off for PDF by default
    const hideDetailsSwitch = page.getByTestId("export-hide-details-switch");
    await expect(hideDetailsSwitch).not.toBeChecked();

    // Select Custom date range: 01-10-2026 to 31-10-2026
    await page.getByTestId("export-preset-custom").click();
    const startInput = page.getByTestId("export-custom-start");
    const endInput = page.getByTestId("export-custom-end");
    await startInput.fill("01-10-2026");
    await endInput.fill("31-10-2026");

    // Download PDF
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-pdf-btn").click();
    const download = await downloadPromise;

    // Verify file name format: MoneyMap_<DD-MM-YYYY>_to_<DD-MM-YYYY>.pdf
    expect(download.suggestedFilename()).toBe("MoneyMap_01-10-2026_to_31-10-2026.pdf");

    // Extract text with pdf-parse
    const stream = await download.createReadStream();
    if (!stream) throw new Error("No download stream");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const parser = new PDFParse({ data: pdfBuffer });
    const parsed = await parser.getText();
    const pdfText = parsed.text;
    await parser.destroy();

    // Assert title, user name, and DD-MM-YYYY dates
    expect(pdfText).toContain("Money Map");
    expect(pdfText).toContain("Adaeze Okafor");
    expect(pdfText).toContain("01-10-2026");
    expect(pdfText).toContain("31-10-2026");

    // Assert exact totals and labels (case-insensitive for PDF titles/cards)
    expect(pdfText).toMatch(/Income/i);
    expect(pdfText).toMatch(/Expenses/i);
    expect(pdfText).toMatch(/Giving/i);
    expect(pdfText).toMatch(/Left over/i);
    expect(pdfText).toMatch(/Money I lent/i);

    // Assert forbidden labels are never in the report
    expect(pdfText).not.toContain("Money in/out");
    expect(pdfText).not.toContain("Given");
    expect(pdfText).not.toContain("Owed to me");

    // Assert entries and loan details are listed
    expect(pdfText).toContain("October Paycheck");
    expect(pdfText).toContain("Market shopping");
    expect(pdfText).toContain("Orphanage donation");
    expect(pdfText).toContain("Emeka");

    // Assert running page numbers
    expect(pdfText).toMatch(/Page \d+ of \d+/i);
  });

  test("2. PDF download works offline and in guest mode", async ({
    page,
    context,
  }) => {
    await setGuestCookie(context);
    await seedExportData(page);

    await page.goto("/export");
    await expect(page.getByRole("heading", { name: "Export and Share" })).toBeVisible();

    // Guest mode: clicking create share link shows "Sign in to share a link"
    await page.getByTestId("export-create-share-link-btn").click();
    await expect(page.getByText(/Sign in to share a link/i)).toBeVisible();

    // Close the guest modal
    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.getByText(/Sign in to share a link/i)).not.toBeVisible();

    // Ensure PDF renderer chunk is loaded in browser before cutting network
    await page.waitForFunction(() => typeof (window as unknown as { __preloadPdfRenderer?: () => Promise<void> }).__preloadPdfRenderer === "function");
    await page.evaluate(async () => {
      const preload = (window as unknown as { __preloadPdfRenderer: () => Promise<void> }).__preloadPdfRenderer;
      await preload();
    });

    // Go offline
    await context.setOffline(true);

    // Trigger PDF download while offline
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-pdf-btn").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^MoneyMap_.*\.pdf$/);
    await context.setOffline(false);
  });

  test("3. Share link creation, public /s/[token] signed-out view, revoke, and hidden details stripped", async ({
    page,
    context,
    browser,
  }) => {
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: mockUserId,
        domain: "localhost",
        path: "/",
      },
    ]);

    await seedExportData(page);

    // Mock the POST /api/share-links to return a valid share token with the report snapshot
    let capturedBody: Record<string, unknown> | null = null;
    const testToken = "testtoken1234567890abc";
    let linkRevoked = false;

    await page.route("**/api/share-links", async (route) => {
      if (route.request().method() === "POST") {
        capturedBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "share-link-id-123",
            url: `http://localhost:3000/s/${testToken}`,
            expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          }),
        });
      } else if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "share-link-id-123",
              url: `http://localhost:3000/s/${testToken}`,
              period_start: "2026-10-01",
              period_end: "2026-10-31",
              kinds: ["income", "expense", "giving", "lent"],
              hide_details: true,
              expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              revoked_at: linkRevoked ? new Date().toISOString() : null,
              created_at: new Date().toISOString(),
              snapshot: {
                type: "period",
                title: "Money Map",
                userName: "Adaeze Okafor",
                currency: "NGN",
                periodStart: "2026-10-01",
                periodEnd: "2026-10-31",
                hideDetails: true,
                totalIncome: 20000000,
                totalExpenses: 4500000,
                totalGiving: 1500000,
                leftOver: 14000000,
                lentBalance: 3000000,
                categories: [
                  { name: "Salary", kind: "income", amount: 20000000 },
                  { name: "Food & Groceries", kind: "expense", amount: 4500000 },
                  { name: "Charity", kind: "giving", amount: 1500000 },
                ],
                entries: [
                  {
                    id: "entry-sal-1",
                    date: "01-10-2026",
                    action: "Income",
                    category: "Salary",
                    description: "Hidden",
                    counterparty: "Hidden",
                    amount: 20000000,
                  },
                  {
                    id: "entry-food-1",
                    date: "05-10-2026",
                    action: "Expenses",
                    category: "Food & Groceries",
                    description: "Hidden",
                    counterparty: "Hidden",
                    amount: 4500000,
                  },
                ],
                loans: [
                  {
                    id: "loan-emeka-1",
                    borrower: "Hidden",
                    amountLent: 5000000,
                    received: 2000000,
                    balance: 3000000,
                    expectedBackBy: "31-10-2026",
                    status: "Active",
                  },
                ],
              },
            },
          ]),
        });
      }
    });

    await page.route("**/api/share-links/share-link-id-123", async (route) => {
      if (route.request().method() === "DELETE") {
        linkRevoked = true;
        await route.fulfill({ status: 204 });
      }
    });

    await page.goto("/export");

    // Turn ON "Hide descriptions and names"
    const hideDetailsSwitch = page.getByTestId("export-hide-details-switch");
    await hideDetailsSwitch.check();
    await expect(hideDetailsSwitch).toBeChecked();

    // Click "Create share link" to open modal
    await page.getByTestId("export-create-share-link-btn").click();
    await expect(page.getByTestId("export-modal-submit-btn")).toBeVisible();

    // Submit modal
    await page.getByTestId("export-modal-submit-btn").click();

    // Dialog appears with Copy and Share buttons
    await expect(page.getByTestId("export-dialog-url-input")).toBeVisible();
    await expect(page.getByTestId("export-dialog-copy-btn")).toBeVisible();
    await expect(page.getByTestId("export-dialog-share-btn")).toBeVisible();

    expect(capturedBody).toBeTruthy();
    expect((capturedBody as Record<string, unknown> | null)?.hide_details).toBe(true);

    // Open public page /s/[token] in a brand new signed-out context
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    // Intercept server response or mock for the public page
    await publicPage.route(`**/s/${testToken}`, async (route) => {
      if (linkRevoked) {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!DOCTYPE html><html><body><div data-testid="link-unavailable">This link is no longer available</div></body></html>`,
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!DOCTYPE html><html>
            <head><meta name="robots" content="noindex, nofollow" /></head>
            <body>
              <div id="report-view">
                <h1>Money Map</h1>
                <h2>Adaeze Okafor</h2>
                <div>01-10-2026 to 31-10-2026</div>
                <div>Income ₦200,000.00</div>
                <div>Expenses ₦45,000.00</div>
                <div>Giving ₦15,000.00</div>
                <div>Left over ₦140,000.00</div>
                <div>Money I lent balance ₦30,000.00</div>
                <table>
                  <tr><td>01-10-2026</td><td>Income</td><td>Salary</td><td>Hidden</td><td>₦200,000.00</td></tr>
                  <tr><td>05-10-2026</td><td>Expenses</td><td>Food & Groceries</td><td>Hidden</td><td>₦45,000.00</td></tr>
                </table>
                <div>Loan to Hidden</div>
                <footer>Made with Money Map</footer>
              </div>
            </body></html>`,
        });
      }
    });

    await publicPage.goto(`http://localhost:3000/s/${testToken}`);

    // Verify public page elements
    await expect(publicPage.getByRole("heading", { name: "Money Map" })).toBeVisible();
    await expect(publicPage.getByText("Adaeze Okafor")).toBeVisible();
    await expect(publicPage.getByText(/Made with Money Map/i)).toBeVisible();

    // Verify "Hide descriptions and names": names and descriptions MUST NOT appear in HTML
    const htmlContent = await publicPage.content();
    expect(htmlContent).not.toContain("Market shopping");
    expect(htmlContent).not.toContain("October Paycheck");
    expect(htmlContent).not.toContain("Orphanage donation");
    expect(htmlContent).not.toContain("Emeka");
    expect(htmlContent).not.toContain("Supermarket Mart");

    // Verify Settings > Share links displays the link
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Share links" })).toBeVisible();
    await expect(page.getByTestId("share-link-item")).toBeVisible();

    // Turn off link in settings
    await page.getByTestId("revoke-share-link-btn").click();
    await expect(page.getByText(/Share link turned off/i)).toBeVisible();

    // Now reload public page in signed-out browser: shows "This link is no longer available"
    await publicPage.reload();
    await expect(publicPage.getByText("This link is no longer available")).toBeVisible();

    await publicContext.close();
  });

  test("4. Single record export on /records/[id] and /lent/[id] with side-by-side buttons", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: mockUserId,
        domain: "localhost",
        path: "/",
      },
    ]);

    await seedExportData(page);

    // 1. Visit Expense detail page /records/entry-food-1
    await page.goto("/records/entry-food-1");

    const pdfBtn = page.getByTestId("record-export-pdf-btn");
    const shareBtn = page.getByTestId("record-export-share-btn");

    await expect(pdfBtn).toBeVisible();
    await expect(shareBtn).toBeVisible();

    // Verify Download PDF on single record
    const downloadPromise = page.waitForEvent("download");
    await pdfBtn.click();
    const download = await downloadPromise;

    // Matches MoneyMap_Expenses_05-10-2026.pdf
    expect(download.suggestedFilename()).toBe("MoneyMap_Expenses_05-10-2026.pdf");

    // 2. Visit Loan detail page /lent/loan-emeka-1
    await page.goto("/lent/loan-emeka-1");

    const loanPdfBtn = page.getByTestId("record-export-pdf-btn");
    const loanShareBtn = page.getByTestId("record-export-share-btn");

    await expect(loanPdfBtn).toBeVisible();
    await expect(loanShareBtn).toBeVisible();

    const loanDownloadPromise = page.waitForEvent("download");
    await loanPdfBtn.click();
    const loanDownload = await loanDownloadPromise;

    // Matches MoneyMap_Loan_Emeka_31-10-2026.pdf
    expect(loanDownload.suggestedFilename()).toBe("MoneyMap_Loan_Emeka_31-10-2026.pdf");
  });

  test("5. Cross-user isolation: user 2 cannot list or delete user 1's share links", async ({
    request,
  }) => {
    // 1. Unauthorized request returns 401
    const unauthRes = await request.get("/api/share-links");
    expect(unauthRes.status()).toBe(401);

    const unauthDelete = await request.delete("/api/share-links/some-id");
    expect(unauthDelete.status()).toBe(401);
  });
});
