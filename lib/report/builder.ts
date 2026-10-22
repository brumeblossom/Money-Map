import { formatDate } from "@/lib/format";
import {
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  loanStatus,
} from "@/lib/calc";
import type {
  PeriodReportSnapshot,
  SingleEntryReportSnapshot,
  SingleLoanReportSnapshot,
} from "./types";
import type { InterestKind, RepeatPlan } from "@/lib/db/dexie";

export interface BuildPeriodReportParams {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  kinds: string[]; // ["income", "expense", "giving", "lent"]
  hideDetails: boolean;
  currency?: string;
  userName?: string | null;
  entries: Array<{
    id: string;
    kind: string;
    amount_minor: number;
    category_id: string;
    occurred_on: string;
    counterparty?: string | null;
    description?: string | null;
    deleted_at?: string | null;
  }>;
  categories: Array<{
    id: string;
    name: string;
    scope?: string;
  }>;
  loans: Array<{
    id: string;
    counterparty: string;
    principal_minor: number;
    category_id: string;
    started_on: string;
    due_on: string;
    interest_type?: string;
    interest_value?: number;
    plan?: string;
    instalment_minor?: number | null;
    deleted_at?: string | null;
  }>;
  loanPayments: Array<{
    id: string;
    loan_id: string;
    amount_minor: number;
    paid_on: string;
    note?: string | null;
    deleted_at?: string | null;
  }>;
  today?: string;
}

export function buildPeriodReport({
  periodStart,
  periodEnd,
  kinds,
  hideDetails,
  currency = "NGN",
  userName,
  entries,
  categories,
  loans,
  loanPayments,
  today = new Date().toISOString().split("T")[0],
}: BuildPeriodReportParams): PeriodReportSnapshot {
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
  }

  // Active kinds
  const includeIncome = kinds.includes("income");
  const includeExpense = kinds.includes("expense") || kinds.includes("expenses");
  const includeGiving = kinds.includes("giving");
  const includeLent = kinds.includes("lent");

  // Filter entries in range [periodStart, periodEnd]
  const validEntries = entries.filter((e) => {
    if (e.deleted_at !== null && e.deleted_at !== undefined) return false;
    if (e.occurred_on < periodStart || e.occurred_on > periodEnd) return false;
    if (e.kind === "income" && !includeIncome) return false;
    if (e.kind === "expense" && !includeExpense) return false;
    if (e.kind === "giving" && !includeGiving) return false;
    return true;
  });

  // Sort chronologically ascending
  validEntries.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

  // Compute totals
  let incomeTotal = 0;
  let expenseTotal = 0;
  let givingTotal = 0;

  const categoryTotals = new Map<
    string,
    { name: string; action: "income" | "expenses" | "giving"; amount: number }
  >();

  const reportEntries = validEntries.map((e) => {
    const actionLabel: "Income" | "Expenses" | "Giving" =
      e.kind === "income" ? "Income" : e.kind === "giving" ? "Giving" : "Expenses";

    if (e.kind === "income") incomeTotal += e.amount_minor;
    else if (e.kind === "expense") expenseTotal += e.amount_minor;
    else if (e.kind === "giving") givingTotal += e.amount_minor;

    const catName = categoryMap.get(e.category_id) || "Uncategorised";
    const catKey = `${e.kind}:${catName}`;
    const existing = categoryTotals.get(catKey);
    const actionKind: "income" | "expenses" | "giving" =
      e.kind === "income" ? "income" : e.kind === "giving" ? "giving" : "expenses";

    if (existing) {
      existing.amount += e.amount_minor;
    } else {
      categoryTotals.set(catKey, {
        name: catName,
        action: actionKind,
        amount: e.amount_minor,
      });
    }

    return {
      id: e.id,
      date: e.occurred_on,
      displayDate: formatDate(e.occurred_on),
      action: actionLabel,
      category: catName,
      description: hideDetails ? "—" : (e.description?.trim() || "—"),
      amount: e.amount_minor,
    };
  });

  // Calculate category percentages relative to total spending (expenses + giving) or income
  const totalSpend = expenseTotal + givingTotal;
  const categoriesList = Array.from(categoryTotals.values())
    .map((c) => {
      const base = c.action === "income" ? incomeTotal : totalSpend;
      const percentage = base > 0 ? Math.round((c.amount / base) * 100) : 0;
      return {
        ...c,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Filter loans
  let lentBalanceTotal = 0;
  const reportLoans: PeriodReportSnapshot["loans"] = [];

  if (includeLent) {
    const validLoans = loans.filter((l) => {
      if (l.deleted_at !== null && l.deleted_at !== undefined) return false;
      // Include loans that were active or started during or before the period end
      if (l.started_on > periodEnd) return false;
      return true;
    });

    for (const loan of validLoans) {
      const activePayments = loanPayments.filter(
        (p) =>
          (p.deleted_at === null || p.deleted_at === undefined) &&
          p.loan_id === loan.id,
      );

      const total = totalToGetBack(
        loan.principal_minor,
        (loan.interest_type || "none") as InterestKind,
        loan.interest_value || 0,
      );
      const paymentRows = activePayments.map((p) => ({
        amount_minor: p.amount_minor,
        deleted_at: p.deleted_at ?? null,
      }));
      const recSoFar = receivedSoFar(paymentRows);
      const balance = balanceLeft(total, recSoFar);

      if (balance > 0) {
        lentBalanceTotal += balance;
      }

      const status = loanStatus(
        today,
        {
          principal_minor: loan.principal_minor,
          started_on: loan.started_on,
          due_on: loan.due_on,
          plan: (loan.plan || "one_payment") as RepeatPlan,
          instalment_minor: loan.instalment_minor ?? null,
          interest_type: (loan.interest_type || "none") as InterestKind,
          interest_value: loan.interest_value || 0,
        },
        paymentRows,
      );

      reportLoans.push({
        id: loan.id,
        borrower: hideDetails ? "Hidden" : loan.counterparty,
        amountLent: loan.principal_minor,
        received: recSoFar,
        balance,
        expectedBackBy: formatDate(loan.due_on),
        status,
      });
    }
  }

  const leftOver = incomeTotal - expenseTotal - givingTotal;

  return {
    type: "period",
    title: "Money Map",
    userName: userName?.trim() || "",
    currency,
    periodStart,
    periodEnd,
    periodLabel: `${formatDate(periodStart)} to ${formatDate(periodEnd)}`,
    hideDetails,
    totals: {
      income: incomeTotal,
      expenses: expenseTotal,
      giving: givingTotal,
      leftOver,
      lentBalance: lentBalanceTotal,
    },
    categories: categoriesList,
    entries: reportEntries,
    loans: reportLoans,
  };
}

export interface BuildSingleEntryReportParams {
  entry: {
    id: string;
    kind: string;
    amount_minor: number;
    category_id: string;
    occurred_on: string;
    counterparty?: string | null;
    description?: string | null;
    recurring_rule_id?: string | null;
  };
  categoryName: string;
  currency?: string;
  userName?: string | null;
  hideDetails: boolean;
  repeats?: "No" | "Weekly" | "Monthly";
}

export function buildSingleEntryReport({
  entry,
  categoryName,
  currency = "NGN",
  userName,
  hideDetails,
  repeats = "No",
}: BuildSingleEntryReportParams): SingleEntryReportSnapshot {
  const actionLabel: "Income" | "Expenses" | "Giving" =
    entry.kind === "income" ? "Income" : entry.kind === "giving" ? "Giving" : "Expenses";

  return {
    type: "single_entry",
    title: "Money Map",
    userName: userName?.trim() || "",
    currency,
    action: actionLabel,
    amount: entry.amount_minor,
    category: categoryName || "Uncategorised",
    date: entry.occurred_on,
    displayDate: formatDate(entry.occurred_on),
    counterparty: hideDetails ? null : (entry.counterparty?.trim() || null),
    description: hideDetails ? null : (entry.description?.trim() || null),
    repeats,
    hideDetails,
  };
}

export interface BuildSingleLoanReportParams {
  loan: {
    id: string;
    counterparty: string;
    principal_minor: number;
    started_on: string;
    due_on: string;
    interest_type?: string;
    interest_value?: number;
    plan?: string;
    instalment_minor?: number | null;
  };
  payments: Array<{
    id: string;
    loan_id: string;
    amount_minor: number;
    paid_on: string;
    note?: string | null;
    deleted_at?: string | null;
  }>;
  currency?: string;
  userName?: string | null;
  hideDetails: boolean;
  today?: string;
}

export function buildSingleLoanReport({
  loan,
  payments,
  currency = "NGN",
  userName,
  hideDetails,
  today = new Date().toISOString().split("T")[0],
}: BuildSingleLoanReportParams): SingleLoanReportSnapshot {
  const activePayments = payments.filter(
    (p) => p.deleted_at === null || p.deleted_at === undefined,
  );
  activePayments.sort((a, b) => b.paid_on.localeCompare(a.paid_on));

  const total = totalToGetBack(
    loan.principal_minor,
    (loan.interest_type || "none") as InterestKind,
    loan.interest_value || 0,
  );
  const paymentRows = activePayments.map((p) => ({
    amount_minor: p.amount_minor,
    deleted_at: p.deleted_at ?? null,
  }));
  const recSoFar = receivedSoFar(paymentRows);
  const balance = balanceLeft(total, recSoFar);

  let interestStr = "None";
  if (loan.interest_type === "percent" && loan.interest_value) {
    interestStr = `${loan.interest_value / 100}%`;
  } else if (loan.interest_type === "flat" && loan.interest_value) {
    interestStr = `Flat (${loan.interest_value})`;
  }

  const status = loanStatus(
    today,
    {
      principal_minor: loan.principal_minor,
      started_on: loan.started_on,
      due_on: loan.due_on,
      plan: (loan.plan || "one_payment") as RepeatPlan,
      instalment_minor: loan.instalment_minor ?? null,
      interest_type: (loan.interest_type || "none") as InterestKind,
      interest_value: loan.interest_value || 0,
    },
    paymentRows,
  );

  return {
    type: "single_loan",
    title: "Money Map",
    userName: userName?.trim() || "",
    currency,
    borrower: hideDetails ? "Hidden" : loan.counterparty,
    amountLent: loan.principal_minor,
    interest: interestStr,
    totalToGetBack: total,
    receivedSoFar: recSoFar,
    balanceLeft: balance,
    expectedBackBy: formatDate(loan.due_on),
    status,
    payments: activePayments.map((p) => ({
      id: p.id,
      date: formatDate(p.paid_on),
      amount: p.amount_minor,
      note: hideDetails ? null : (p.note?.trim() || null),
    })),
    hideDetails,
  };
}
