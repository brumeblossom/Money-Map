import { test, expect, Page, Download } from "@playwright/test";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import { setGuestCookie, setTestAuthCookie } from "./test-helpers";

const MOCK_USER_ID = "77777777-7777-7777-7777-777777777777";

async function seedData(page: Page, userId: string) {
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as unknown as { __db?: unknown }).__db));

  await page.evaluate(async (uid) => {
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
      };
    };

    const now = new Date().toISOString();

    await win.__db.profiles.put({
      user_id: uid,
      display_name: "Test User",
      currency: "NGN",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    await win.__db.categories.clear();
    await win.__db.categories.bulkAdd([
      {
        id: "cat-sal",
        user_id: uid,
        name: "Salary",
        scope: "income",
        is_hidden: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: "cat-food",
        user_id: uid,
        name: "Groceries",
        scope: "expense",
        is_hidden: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]);

    await win.__db.entries.clear();
    await win.__db.entries.bulkAdd([
      {
        id: "entry-prompt22b-1",
        user_id: uid,
        kind: "income",
        amount_minor: 15000000, // ₦150,000
        category_id: "cat-sal",
        occurred_on: "2026-11-10",
        counterparty: "Acme Corp",
        description: "Monthly Salary",
        recurring_rule_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: "entry-prompt22b-2",
        user_id: uid,
        kind: "expense",
        amount_minor: 2500000, // ₦25,000
        category_id: "cat-food",
        occurred_on: "2026-11-12",
        counterparty: "Supermarket",
        description: "Weekly food run",
        recurring_rule_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]);

    await win.__db.loans.clear();
    await win.__db.loans.put({
      id: "loan-prompt22b-1",
      user_id: uid,
      counterparty: "Emeka",
      principal_minor: 6000000, // ₦60,000
      category_id: null,
      started_on: "2026-11-01",
      due_on: "2026-12-20",
      plan: "one_payment",
      interest_type: "none",
      interest_value: 0,
      instalment_minor: null,
      remind_on: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }, userId);
}

// Track any Content Security Policy violation errors for workers
function trackCspErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      msg.type() === "error" &&
      (text.includes("Refused to create a worker") ||
        (text.includes("Content Security Policy") && text.includes("worker-src")) ||
        (text.includes("Content Security Policy") && text.includes("script-src")))
    ) {
      errors.push(text);
    }
  });
  return errors;
}

// Inspect downloaded PDF stream for icon, font, and ₦ symbol
async function verifyDownloadedPdf(download: Download) {
  const path = await download.path();
  expect(path).toBeTruthy();
  const buffer = fs.readFileSync(path!);

  expect(buffer.length).toBeGreaterThan(1000);
  const pdfString = buffer.toString("binary");

  expect(pdfString.startsWith("%PDF-")).toBe(true);
  expect(pdfString.includes("PlusJakartaSans")).toBe(true);
  expect(pdfString.includes("/Subtype /Image")).toBe(true);

  // Parse text using PDFParse to inspect decompressed content
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  const text = parsed.text;
  await parser.destroy();

  const hasNairaOrAmount =
    text.includes("₦") ||
    text.includes("150,000") ||
    text.includes("25,000") ||
    text.includes("60,000");
  expect(hasNairaOrAmount).toBe(true);
}

test.describe("PDF Export Verification (Prompt 22b)", () => {
  test("1a. Records > Export PDF > Download PDF triggers download within 15s for guest", async ({
    page,
    context,
  }) => {
    test.setTimeout(30000);
    await setGuestCookie(context);
    const cspErrors = trackCspErrors(page);

    await seedData(page, "guest");

    // Go to /records and trigger export modal
    await page.goto("/records");
    await page.waitForLoadState("networkidle");

    const exportBtn = page
      .locator('[data-testid="records-export-button"], [data-testid="records-export-mobile-button"]')
      .filter({ visible: true });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click({ force: true });

    // Modal/Drawer opens
    const downloadBtn = page.getByTestId("export-download-pdf-btn");
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    await downloadBtn.scrollIntoViewIfNeeded();

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await downloadBtn.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename().endsWith(".pdf")).toBe(true);
    await verifyDownloadedPdf(download);
    expect(cspErrors).toEqual([]);
  });

  test("1b. Records > Export PDF > Download PDF triggers download within 15s for signed-in user", async ({
    page,
    context,
  }) => {
    test.setTimeout(30000);
    await setTestAuthCookie(context, MOCK_USER_ID);
    const cspErrors = trackCspErrors(page);

    await seedData(page, MOCK_USER_ID);

    // Go to /records and trigger export
    await page.goto("/records");
    await page.waitForLoadState("networkidle");

    const exportBtn = page
      .locator('[data-testid="records-export-button"], [data-testid="records-export-mobile-button"]')
      .filter({ visible: true });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click({ force: true });

    // Modal/Drawer opens
    const downloadBtn = page.getByTestId("export-download-pdf-btn");
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    await downloadBtn.scrollIntoViewIfNeeded();

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await downloadBtn.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename().endsWith(".pdf")).toBe(true);
    await verifyDownloadedPdf(download);
    expect(cspErrors).toEqual([]);
  });

  test("2. Single entry PDF button downloads within 15s", async ({ page, context }) => {
    test.setTimeout(30000);
    await setGuestCookie(context);
    const cspErrors = trackCspErrors(page);

    await seedData(page, "guest");

    // Go directly to entry detail page
    await page.goto("/records/entry-prompt22b-1");
    await page.waitForLoadState("networkidle");

    const downloadPdfBtn = page
      .locator('[data-testid="detail-export-pdf-button"], [data-testid="detail-export-pdf-mobile-button"]')
      .filter({ visible: true });
    await expect(downloadPdfBtn).toBeVisible({ timeout: 10000 });
    await downloadPdfBtn.scrollIntoViewIfNeeded();

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await downloadPdfBtn.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename().endsWith(".pdf")).toBe(true);
    await verifyDownloadedPdf(download);
    expect(cspErrors).toEqual([]);
  });

  test("3. Single loan PDF button downloads within 15s", async ({ page, context }) => {
    test.setTimeout(30000);
    await setGuestCookie(context);
    const cspErrors = trackCspErrors(page);

    await seedData(page, "guest");

    // Go directly to loan detail page
    await page.goto("/lent/loan-prompt22b-1");
    await page.waitForLoadState("networkidle");

    const downloadLoanPdfBtn = page
      .locator('[data-testid="loan-export-pdf-button"], [data-testid="loan-export-pdf-mobile-button"]')
      .filter({ visible: true });
    await expect(downloadLoanPdfBtn).toBeVisible({ timeout: 10000 });
    await downloadLoanPdfBtn.scrollIntoViewIfNeeded();

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await downloadLoanPdfBtn.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename().endsWith(".pdf")).toBe(true);
    await verifyDownloadedPdf(download);
    expect(cspErrors).toEqual([]);
  });
});
