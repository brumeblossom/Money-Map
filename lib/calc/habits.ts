import type { EntryRow, CategoryRow } from "@/lib/db/dexie";
import {
  type DatePeriod,
  type HabitLabel,
  habitLabel,
  habitsSummary,
  sixMonthTrend,
  countAndAverage,
  busiestWeekday,
  biggestEntry,
} from "./index";

export interface CategoryHabitInfo {
  label: HabitLabel;
  explanation: string;
  m0: number;
  m1: number;
  m2: number;
  m3: number;
  entryCountOver4Months: number;
}

export interface HabitCategoryCardItem {
  categoryId: string;
  categoryName: string;
  categorySlug: string | null;
  total_minor: number;
  share: number; // 0 to 100
  label: HabitLabel;
  explanation: string;
  sparklineTrend: Array<{ month: string; amount_minor: number }>;
  entryCountInPeriod: number;
}

export interface HabitsSummaryResult {
  rising: Array<{ categoryId: string; sentence: string; diffAmount: number; percent: number }>;
  falling: Array<{ categoryId: string; sentence: string; diffAmount: number; percent: number }>;
}

export interface CategoryHabitDetailReport {
  categoryId: string;
  categoryName: string;
  categorySlug: string | null;
  total_minor: number;
  totalPeriodExpenses: number;
  share: number;
  count: number;
  average_minor: number;
  busiestWeekday: string | null;
  biggestEntry: EntryRow | null;
  habit: CategoryHabitInfo;
  sixMonthTrend: Array<{
    month: string;
    label: string;
    amount_minor: number;
    amount_major: number;
  }>;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getMonthAbbr(monthIso: string): string {
  const [, m] = monthIso.split("-").map(Number);
  return MONTH_NAMES[(m - 1 + 12) % 12] ?? monthIso;
}

/**
 * Returns the exact one-line plain English explanation of why a habit label was assigned.
 */
export function habitExplanation(label: HabitLabel): string {
  switch (label) {
    case "Rising":
      return "Up more than 15% two months in a row";
    case "Falling":
      return "Down more than 15% two months in a row";
    case "Spike":
      return "More than double the 3-month average";
    case "Steady":
      return "Spending is steady across recent months";
    case "Not enough data yet":
      return "Fewer than 3 entries in the last 4 months";
  }
}

/**
 * Computes habit label and explanation for a given category across whole calendar months M0, M1, M2, M3.
 */
export function getCategoryHabit(
  categoryId: string,
  entries: Array<Pick<EntryRow, "category_id" | "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  currentMonthIso: string, // YYYY-MM
): CategoryHabitInfo {
  const [currY, currM] = currentMonthIso.split("-").map(Number);

  const getMonthStr = (offset: number) => {
    const d = new Date(Date.UTC(currY, currM - 1 - offset, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const m0Iso = getMonthStr(0);
  const m1Iso = getMonthStr(1);
  const m2Iso = getMonthStr(2);
  const m3Iso = getMonthStr(3);

  let m0 = 0;
  let m1 = 0;
  let m2 = 0;
  let m3 = 0;
  let entryCount = 0;

  for (const e of entries) {
    if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
    if (e.kind !== "expense" || e.category_id !== categoryId) continue;

    if (e.occurred_on.startsWith(m0Iso)) {
      m0 += e.amount_minor;
      entryCount++;
    } else if (e.occurred_on.startsWith(m1Iso)) {
      m1 += e.amount_minor;
      entryCount++;
    } else if (e.occurred_on.startsWith(m2Iso)) {
      m2 += e.amount_minor;
      entryCount++;
    } else if (e.occurred_on.startsWith(m3Iso)) {
      m3 += e.amount_minor;
      entryCount++;
    }
  }

  const label = habitLabel(m0, m1, m2, m3, entryCount);
  return {
    label,
    explanation: habitExplanation(label),
    m0,
    m1,
    m2,
    m3,
    entryCountOver4Months: entryCount,
  };
}

/**
 * Computes the full habits list for all expense categories in a period:
 * - Top summary: 3 rising & 3 falling sentences
 * - Cards per expense category ranked by amount spent in the selected period P
 * - Each category card includes total, share, habit label badge, and 6-month sparkline.
 */
export function computeHabitsOverview(params: {
  categories: CategoryRow[];
  entries: EntryRow[];
  period: DatePeriod;
  currentMonthIso: string;
  currency?: string;
}): {
  summary: HabitsSummaryResult;
  categories: HabitCategoryCardItem[];
  totalPeriodExpenses: number;
} {
  const { categories, entries, period, currentMonthIso, currency = "NGN" } = params;

  // Filter to expense categories
  const expenseCategories = categories.filter(
    (c) => c.scope === "expense" && (c.deleted_at === null || c.deleted_at === undefined),
  );

  // Total expenses in period P
  let totalPeriodExpenses = 0;
  const categoryTotalsMap = new Map<string, { total_minor: number; count: number }>();

  for (const e of entries) {
    if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
    if (e.kind === "expense" && e.occurred_on >= period.start && e.occurred_on <= period.end) {
      totalPeriodExpenses += e.amount_minor;
      const current = categoryTotalsMap.get(e.category_id) || { total_minor: 0, count: 0 };
      current.total_minor += e.amount_minor;
      current.count += 1;
      categoryTotalsMap.set(e.category_id, current);
    }
  }

  // Habits summary (top 3 rising and top 3 falling sentences)
  const summary = habitsSummary(
    expenseCategories.map((c) => ({ id: c.id, name: c.name })),
    entries,
    currentMonthIso,
    currency,
  );

  // Build card data for each expense category
  const categoryCards: HabitCategoryCardItem[] = expenseCategories.map((cat) => {
    const periodStats = categoryTotalsMap.get(cat.id) || { total_minor: 0, count: 0 };
    const share =
      totalPeriodExpenses > 0
        ? Math.round((periodStats.total_minor / totalPeriodExpenses) * 100)
        : 0;

    const habitInfo = getCategoryHabit(cat.id, entries, currentMonthIso);
    const sparklineTrend = sixMonthTrend(cat.id, entries, currentMonthIso);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
      total_minor: periodStats.total_minor,
      share,
      label: habitInfo.label,
      explanation: habitInfo.explanation,
      sparklineTrend,
      entryCountInPeriod: periodStats.count,
    };
  });

  // Rank by amount spent in the selected period (highest first)
  categoryCards.sort((a, b) => {
    if (b.total_minor !== a.total_minor) {
      return b.total_minor - a.total_minor;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  return {
    summary,
    categories: categoryCards,
    totalPeriodExpenses,
  };
}

/**
 * Computes full detail report for a single category:
 * - total and share
 * - 6-month trend line chart
 * - count and average per entry
 * - busiest weekday
 * - biggest entry (tappable to its record)
 * - habit label with one-line explanation
 */
export function computeCategoryDetailReport(params: {
  categoryId: string;
  categories: CategoryRow[];
  entries: EntryRow[];
  period: DatePeriod;
  currentMonthIso: string;
}): CategoryHabitDetailReport | null {
  const { categoryId, categories, entries, period, currentMonthIso } = params;

  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return null;
  }

  // Find all category entries in period
  const entriesInPeriod: EntryRow[] = [];
  let total_minor = 0;
  let totalPeriodExpenses = 0;

  for (const e of entries) {
    if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
    if (e.kind === "expense" && e.occurred_on >= period.start && e.occurred_on <= period.end) {
      totalPeriodExpenses += e.amount_minor;
      if (e.category_id === categoryId) {
        entriesInPeriod.push(e);
        total_minor += e.amount_minor;
      }
    }
  }

  const share =
    totalPeriodExpenses > 0
      ? Math.round((total_minor / totalPeriodExpenses) * 100)
      : 0;

  const countAvg = countAndAverage(entriesInPeriod);
  const weekday = busiestWeekday(entriesInPeriod);
  const biggest = biggestEntry(entriesInPeriod);
  const habit = getCategoryHabit(categoryId, entries, currentMonthIso);

  const rawTrend = sixMonthTrend(categoryId, entries, currentMonthIso);
  const trendWithLabels = rawTrend.map((pt) => ({
    month: pt.month,
    label: getMonthAbbr(pt.month),
    amount_minor: pt.amount_minor,
    amount_major: pt.amount_minor / 100,
  }));

  return {
    categoryId,
    categoryName: category.name,
    categorySlug: category.slug,
    total_minor,
    totalPeriodExpenses,
    share,
    count: countAvg.count,
    average_minor: countAvg.average,
    busiestWeekday: weekday,
    biggestEntry: biggest,
    habit,
    sixMonthTrend: trendWithLabels,
  };
}
