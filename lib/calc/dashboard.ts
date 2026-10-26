import type { EntryRow, CategoryRow, LoanRow, LoanPaymentRow } from "@/lib/db/dexie";
import {
  type DatePeriod,
  type PeriodTotals,
  type LoanStatus,
  periodTotals,
  previousPeriod,
  percentChange,
  owedToMe,
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  loanStatus,
  loanProgress,
  nextExpectedDate,
  loanCountdown,
  smartTip,
  diffInDays,
} from "./index";

export const CATEGORY_DONUT_COLORS = [
  "#5B3FD1", // Violet
  "#2E9AA6", // Teal
  "#E8A93A", // Amber
  "#E5604A", // Coral
  "#1F8A63", // Green
  "#5E636B", // Slate / Other
];

export interface CategorySpendItem {
  id: string; // Category ID or "other"
  name: string;
  amount_minor: number;
  percent: number;
  color: string;
}

export interface SpendingByCategoryResult {
  items: CategorySpendItem[];
  total_minor: number;
}

export interface CashFlowPoint {
  key: string;       // YYYY-MM-DD or YYYY-MM
  label: string;     // DD-MM or Month Name
  income_minor: number;
  expenses_minor: number;
  income: number;    // Major units for chart display
  expenses: number;  // Major units for chart display
}

export interface ActiveLoanMetric {
  loan: LoanRow;
  total: number;
  received: number;
  balance: number;
  status: LoanStatus;
  progressPercent: number;
  nextDate: string | null;
  countdown: string;
}

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Computes top 5 expense categories + Other for the donut chart and ranked list.
 */
export function computeSpendingByCategory(
  entries: Array<Pick<EntryRow, "category_id" | "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  categories: Array<Pick<CategoryRow, "id" | "name">>,
  period: DatePeriod,
): SpendingByCategoryResult {
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  // Aggregate expenses in period by category
  const categorySums = new Map<string, number>();
  let totalExpenseMinor = 0;

  for (const entry of entries) {
    if (entry.deleted_at !== null && entry.deleted_at !== undefined) continue;
    if (entry.kind !== "expense") continue;
    if (entry.occurred_on < period.start || entry.occurred_on > period.end) continue;

    const current = categorySums.get(entry.category_id) || 0;
    categorySums.set(entry.category_id, current + entry.amount_minor);
    totalExpenseMinor += entry.amount_minor;
  }

  if (totalExpenseMinor === 0) {
    return { items: [], total_minor: 0 };
  }

  // Sort descending by amount
  const sorted = Array.from(categorySums.entries())
    .map(([id, amount]) => ({
      id,
      name: categoryMap.get(id) || "Other",
      amount_minor: amount,
    }))
    .sort((a, b) => b.amount_minor - a.amount_minor);

  const top5 = sorted.slice(0, 5);
  const remaining = sorted.slice(5);

  const items: CategorySpendItem[] = top5.map((item, idx) => ({
    id: item.id,
    name: item.name,
    amount_minor: item.amount_minor,
    percent: Math.round((item.amount_minor / totalExpenseMinor) * 100),
    color: CATEGORY_DONUT_COLORS[idx % (CATEGORY_DONUT_COLORS.length - 1)],
  }));

  if (remaining.length > 0) {
    const otherSum = remaining.reduce((acc, curr) => acc + curr.amount_minor, 0);
    items.push({
      id: "other",
      name: "Other",
      amount_minor: otherSum,
      percent: Math.round((otherSum / totalExpenseMinor) * 100),
      color: CATEGORY_DONUT_COLORS[5], // slate-400
    });
  }

  return {
    items,
    total_minor: totalExpenseMinor,
  };
}

/**
 * Computes Income vs Expenses series for grouped bar chart:
 * - Short periods (<= 21 days or thisWeek): Daily bars with DD-MM labels.
 * - Longer periods: Monthly bars (last 6 months or months in period) with Month name labels.
 */
export function computeCashFlowSeries(
  entries: Array<Pick<EntryRow, "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  period: DatePeriod,
  today: string,
): CashFlowPoint[] {
  const daysDiff = diffInDays(period.start, period.end);
  const isShortPeriod = daysDiff <= 21;

  if (isShortPeriod) {
    // Generate daily points from period.start to period.end
    const points: CashFlowPoint[] = [];
    const [startYear, startMonth, startDay] = period.start.split("-").map(Number);
    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    for (let i = 0; i <= daysDiff; i++) {
      const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + i));
      const year = d.getUTCFullYear();
      const monthStr = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getUTCDate()).padStart(2, "0");
      const isoDate = `${year}-${monthStr}-${dayStr}`;
      const label = `${dayStr}-${monthStr}`; // DD-MM

      points.push({
        key: isoDate,
        label,
        income_minor: 0,
        expenses_minor: 0,
        income: 0,
        expenses: 0,
      });
    }

    const pointMap = new Map<string, CashFlowPoint>();
    for (const p of points) {
      pointMap.set(p.key, p);
    }

    for (const entry of entries) {
      if (entry.deleted_at !== null && entry.deleted_at !== undefined) continue;
      const point = pointMap.get(entry.occurred_on);
      if (!point) continue;

      if (entry.kind === "income") {
        point.income_minor += entry.amount_minor;
        point.income = Math.round((point.income_minor / 100) * 100) / 100;
      } else if (entry.kind === "expense") {
        point.expenses_minor += entry.amount_minor;
        point.expenses = Math.round((point.expenses_minor / 100) * 100) / 100;
      }
    }

    return points;
  }

  // Monthly points: Last 6 calendar months ending at max(period.end month, today month)
  const [endYear, endMonth] = (period.end < today ? period.end : today).split("-").map(Number);
  const monthKeys: Array<{ key: string; label: string }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(endYear, endMonth - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    monthKeys.push({
      key: ym,
      label: SHORT_MONTH_NAMES[m],
    });
  }

  const pointMap = new Map<string, CashFlowPoint>();
  const points: CashFlowPoint[] = monthKeys.map(({ key, label }) => {
    const pt: CashFlowPoint = {
      key,
      label,
      income_minor: 0,
      expenses_minor: 0,
      income: 0,
      expenses: 0,
    };
    pointMap.set(key, pt);
    return pt;
  });

  for (const entry of entries) {
    if (entry.deleted_at !== null && entry.deleted_at !== undefined) continue;
    const ym = entry.occurred_on.slice(0, 7);
    const point = pointMap.get(ym);
    if (!point) continue;

    if (entry.kind === "income") {
      point.income_minor += entry.amount_minor;
      point.income = Math.round((point.income_minor / 100) * 100) / 100;
    } else if (entry.kind === "expense") {
      point.expenses_minor += entry.amount_minor;
      point.expenses = Math.round((point.expenses_minor / 100) * 100) / 100;
    }
  }

  return points;
}

/**
 * Computes metrics for active loans for the Money I lent dashboard block.
 */
export function computeActiveLoans(
  loans: LoanRow[],
  payments: LoanPaymentRow[],
  today: string,
): ActiveLoanMetric[] {
  const active: ActiveLoanMetric[] = [];

  for (const loan of loans) {
    if (loan.deleted_at !== null && loan.deleted_at !== undefined) continue;

    const loanPayments = payments.filter(
      (p) => (p.deleted_at === null || p.deleted_at === undefined) && p.loan_id === loan.id,
    );

    const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
    const received = receivedSoFar(loanPayments);
    const balance = balanceLeft(total, received);

    if (balance <= 0) continue; // Skip paid off loans

    const nextDate = nextExpectedDate(loan, loanPayments);
    const status = loanStatus(today, loan, loanPayments);
    const progressPercent = Math.round(loanProgress(total, received) * 100);
    const countdown = loanCountdown(today, nextDate, status);

    active.push({
      loan,
      total,
      received,
      balance,
      status,
      progressPercent,
      nextDate,
      countdown,
    });
  }

  return active;
}

/**
 * Comprehensive dashboard calculation engine.
 * Pure computation, zero Dexie/React dependencies.
 */
export function computeDashboardData(params: {
  entries: EntryRow[];
  categories: CategoryRow[];
  loans: LoanRow[];
  loanPayments: LoanPaymentRow[];
  period: DatePeriod;
  today: string;
  currency?: string;
}): {
  totals: PeriodTotals;
  prevTotals: PeriodTotals;
  leftOverChange: number | "New";
  totalOwed: number;
  activeLoans: ActiveLoanMetric[];
  spendingByCategory: SpendingByCategoryResult;
  cashFlowSeries: CashFlowPoint[];
  smartTipText: string;
  recentEntries: EntryRow[];
} {
  const {
    entries,
    categories,
    loans,
    loanPayments,
    period,
    today,
    currency = "NGN",
  } = params;

  // 1. Period totals and Left over
  const totals = periodTotals(entries, period);
  const prevPeriod = previousPeriod(period);
  const prevTotals = periodTotals(entries, prevPeriod);
  const leftOverChange = percentChange(totals.leftOver, prevTotals.leftOver);

  // 2. Owed to me & Active Loans
  const totalOwed = owedToMe(loans, loanPayments);
  const activeLoans = computeActiveLoans(loans, loanPayments, today);

  // 3. Spending by Category
  const spendingByCategory = computeSpendingByCategory(entries, categories, period);

  // 4. Cash Flow Series (Income vs Expenses)
  const cashFlowSeries = computeCashFlowSeries(entries, period, today);

  // 5. Smart Tip
  const currentMonthIso = today.slice(0, 7);
  const smartTipText = smartTip(categories, entries, currentMonthIso, currency);

  // 6. Recent Entries (last 5 active entries in period)
  const periodEntries = entries.filter((e) => {
    if (e.deleted_at !== null && e.deleted_at !== undefined) return false;
    return e.occurred_on >= period.start && e.occurred_on <= period.end;
  });

  const recentEntries = [...periodEntries]
    .sort((a, b) => {
      const dateCmp = b.occurred_on.localeCompare(a.occurred_on);
      if (dateCmp !== 0) return dateCmp;
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, 5);

  return {
    totals,
    prevTotals,
    leftOverChange,
    totalOwed,
    activeLoans,
    spendingByCategory,
    cashFlowSeries,
    smartTipText,
    recentEntries,
  };
}
