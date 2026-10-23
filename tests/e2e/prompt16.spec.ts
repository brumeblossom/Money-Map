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

    // Assert title, no user name (Rule 13), Naira symbol (Rule 12), and DD-MM-YYYY dates
    expect(pdfText).toContain("Money Map");
    expect(pdfText).not.toContain("Adaeze Okafor");
    expect(pdfText).toContain("₦");
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

  test("2. Guest offline PDF export works without server roundtrip", async ({
    page,
    context,
  }) => {
    await setGuestCookie(context);
    await seedExportData(page);

    await page.goto("/export");
    await expect(page.getByRole("heading", { name: "Export PDF" })).toBeVisible();

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

  test("3. Single record export on /records/[id] and /lent/[id] with Download PDF button", async ({
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
    await expect(pdfBtn).toBeVisible();

    // Verify Download PDF on single record
    const downloadPromise = page.waitForEvent("download");
    await pdfBtn.click();
    const download = await downloadPromise;

    // Matches MoneyMap_Expenses_05-10-2026.pdf
    expect(download.suggestedFilename()).toBe("MoneyMap_Expenses_05-10-2026.pdf");

    // 2. Visit Loan detail page /lent/loan-emeka-1
    await page.goto("/lent/loan-emeka-1");

    const loanPdfBtn = page.getByTestId("record-export-pdf-btn");
    await expect(loanPdfBtn).toBeVisible();

    const loanDownloadPromise = page.waitForEvent("download");
    await loanPdfBtn.click();
    const loanDownload = await loanDownloadPromise;

    // Matches MoneyMap_Loan_Emeka_31-10-2026.pdf
    expect(loanDownload.suggestedFilename()).toBe("MoneyMap_Loan_Emeka_31-10-2026.pdf");
  });
});
