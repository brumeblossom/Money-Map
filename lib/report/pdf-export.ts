import React from "react";
import type { ReportSnapshot } from "./types";
import type { DocumentProps } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";

export function getReportPdfFileName(snapshot: ReportSnapshot): string {
  if (snapshot.type === "single_entry") {
    const action = snapshot.action;
    const dateStr = snapshot.displayDate;
    return `MoneyMap_${action}_${dateStr}.pdf`;
  }

  if (snapshot.type === "single_loan") {
    const borrower =
      snapshot.borrower && snapshot.borrower !== "Hidden"
        ? `${snapshot.borrower.replace(/[^a-zA-Z0-9_-]/g, "_")}_`
        : "";
    const dateStr = snapshot.expectedBackBy;
    return `MoneyMap_Loan_${borrower}${dateStr}.pdf`;
  }

  // Period report
  const startStr = formatDate(snapshot.periodStart);
  const endStr = formatDate(snapshot.periodEnd);
  return `MoneyMap_${startStr}_to_${endStr}.pdf`;
}

export async function preloadPdfRenderer(): Promise<void> {
  await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/report/pdf-document"),
  ]);
}

/**
 * Lazily loads @react-pdf/renderer, builds the PDF blob, and triggers browser download.
 * Works offline and in guest mode without making network requests.
 */
export async function downloadReportPdf(snapshot: ReportSnapshot): Promise<void> {
  const [{ pdf }, { ReportPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/report/pdf-document"),
  ]);

  const docElement = React.createElement(ReportPdfDocument, { snapshot });
  const blob = await pdf(docElement as unknown as React.ReactElement<DocumentProps>).toBlob();

  const fileName = getReportPdfFileName(snapshot);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
