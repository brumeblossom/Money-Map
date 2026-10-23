import { describe, it, expect } from "vitest";
import React from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { PDFParse } from "pdf-parse";
import { ReportPdfDocument } from "@/components/report/pdf-document";
import type { ReportSnapshot } from "@/lib/report/types";

describe("PDF Report Font & Formatting (F12, F13)", () => {
  it("renders PDF containing ₦ (U+20A6) and no user name", async () => {
    const mockSnapshot: ReportSnapshot = {
      type: "period",
      title: "Money Map",
      userName: "Secret User Name",
      currency: "NGN",
      periodLabel: "01-10-2026 to 31-10-2026",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      hideDetails: false,
      totals: {
        income: 5000000,
        expenses: 1200000,
        giving: 300000,
        leftOver: 3500000,
        lentBalance: 800000,
      },
      categories: [
        { name: "Salary", action: "income", amount: 5000000, percentage: 80 },
        { name: "Food", action: "expenses", amount: 1200000, percentage: 20 },
      ],
      entries: [
        {
          id: "entry-1",
          date: "2026-10-05",
          displayDate: "05-10-2026",
          action: "Income",
          category: "Salary",
          description: "Monthly salary",
          amount: 5000000,
        },
      ],
      loans: [
        {
          id: "loan-1",
          borrower: "Emeka",
          amountLent: 1000000,
          received: 200000,
          balance: 800000,
          expectedBackBy: "31-10-2026",
          status: "Active",
        },
      ],
    };

    const doc = React.createElement(ReportPdfDocument, { snapshot: mockSnapshot });
    const blob = await pdf(doc as unknown as React.ReactElement<DocumentProps>).toBlob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(0);

    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text;
    await parser.destroy();

    // Verify Naira sign is preserved
    expect(text).toContain("₦");
    // Verify user name is removed as per Rule 13
    expect(text).not.toContain("Secret User Name");
    // Verify basic content
    expect(text).toContain("Money Map");
    expect(text).toContain("01-10-2026 to 31-10-2026");
  });
});
