export type ReportKind = "period" | "single_entry" | "single_loan";

export interface PeriodReportSnapshot {
  type: "period";
  title: "Money Map";
  userName: string;
  currency: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  periodLabel: string; // e.g. "01-10-2026 to 31-10-2026"
  hideDetails: boolean;
  totals: {
    income: number; // minor
    expenses: number; // minor
    giving: number; // minor
    leftOver: number; // minor
    lentBalance: number; // minor
  };
  categories: {
    name: string;
    action: "income" | "expenses" | "giving";
    amount: number; // minor
    percentage: number; // 0..100
  }[];
  entries: {
    id: string;
    date: string; // YYYY-MM-DD
    displayDate: string; // DD-MM-YYYY
    action: "Income" | "Expenses" | "Giving";
    category: string;
    description: string;
    amount: number; // minor
  }[];
  loans: {
    id: string;
    borrower: string;
    amountLent: number; // minor
    received: number; // minor
    balance: number; // minor
    expectedBackBy: string; // DD-MM-YYYY
    status: string;
  }[];
}

export interface SingleEntryReportSnapshot {
  type: "single_entry";
  title: "Money Map";
  userName: string;
  currency: string;
  action: "Income" | "Expenses" | "Giving";
  amount: number; // minor
  category: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // DD-MM-YYYY
  counterparty: string | null;
  description: string | null;
  repeats: "No" | "Weekly" | "Monthly";
  hideDetails: boolean;
}

export interface SingleLoanReportSnapshot {
  type: "single_loan";
  title: "Money Map";
  userName: string;
  currency: string;
  borrower: string;
  amountLent: number; // minor
  interest: string;
  totalToGetBack: number; // minor
  receivedSoFar: number; // minor
  balanceLeft: number; // minor
  expectedBackBy: string; // DD-MM-YYYY
  status: string;
  payments: {
    id: string;
    date: string; // DD-MM-YYYY
    amount: number; // minor
    note: string | null;
  }[];
  hideDetails: boolean;
}

export type ReportSnapshot =
  | PeriodReportSnapshot
  | SingleEntryReportSnapshot
  | SingleLoanReportSnapshot;
