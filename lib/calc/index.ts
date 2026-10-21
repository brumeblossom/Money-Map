import { formatMoney } from "@/lib/format";
import type { EntryRow, LoanRow, LoanPaymentRow, RepeatPlan, InterestKind } from "@/lib/db/dexie";

// ============================================================================
// Types
// ============================================================================

export interface DatePeriod {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface PeriodTotals {
  moneyIn: number;
  expenses: number;
  giving: number;
  moneyOut: number;
  leftOver: number;
}

export type LoanStatus = "Paid off" | "Overdue" | "Due soon" | "Active";

export type HabitLabel =
  | "Spike"
  | "Rising"
  | "Falling"
  | "Steady"
  | "Not enough data yet";

// ============================================================================
// Date Utility Helpers (Pure string and UTC math)
// ============================================================================

function parseDateUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diffInDays(startStr: string, endStr: string): number {
  const msPerDay = 86_400_000;
  const start = parseDateUtc(startStr).getTime();
  const end = parseDateUtc(endStr).getTime();
  return Math.round((end - start) / msPerDay);
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateUtc(d);
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Target month
  const targetYear = y + Math.floor((m - 1 + months) / 12);
  const targetMonth = ((m - 1 + months) % 12 + 12) % 12 + 1;
  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(d, maxDays);
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

// ============================================================================
// 1. Period Totals & Owed To Me (PRD 5.1)
// ============================================================================

/**
 * Computes period totals for active entries within an inclusive date period P.
 * All amounts are integer minor units.
 */
export function periodTotals(
  rows: Array<Pick<EntryRow, "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  period: DatePeriod,
): PeriodTotals {
  let moneyIn = 0;
  let expenses = 0;
  let giving = 0;

  for (const row of rows) {
    if (row.deleted_at !== null && row.deleted_at !== undefined) continue;
    if (row.occurred_on >= period.start && row.occurred_on <= period.end) {
      if (row.kind === "income") {
        moneyIn += row.amount_minor;
      } else if (row.kind === "expense") {
        expenses += row.amount_minor;
      } else if (row.kind === "giving") {
        giving += row.amount_minor;
      }
    }
  }

  const moneyOut = expenses + giving;
  const leftOver = moneyIn - moneyOut;

  return {
    moneyIn,
    expenses,
    giving,
    moneyOut,
    leftOver,
  };
}

/**
 * Sum of Balance left over all loans not Paid off (not limited to period P).
 */
export function owedToMe(
  loans: Array<
    Pick<LoanRow, "id" | "principal_minor" | "interest_type" | "interest_value" | "deleted_at">
  >,
  payments: Array<Pick<LoanPaymentRow, "loan_id" | "amount_minor" | "deleted_at">>,
): number {
  let totalOwed = 0;

  for (const loan of loans) {
    if (loan.deleted_at !== null && loan.deleted_at !== undefined) continue;
    const loanPayments = payments.filter(
      (p) => (p.deleted_at === null || p.deleted_at === undefined) && p.loan_id === loan.id,
    );
    const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
    const received = receivedSoFar(loanPayments);
    const balance = balanceLeft(total, received);

    if (balance > 0) {
      totalOwed += balance;
    }
  }

  return totalOwed;
}

// ============================================================================
// 2. Previous Period & Percent Change (PRD 5.1)
// ============================================================================

/**
 * Returns the previous period of equal length ending the day before period P starts.
 */
export function previousPeriod(period: DatePeriod): DatePeriod {
  const lengthInDays = diffInDays(period.start, period.end) + 1;
  const prevEnd = addDays(period.start, -1);
  const prevStart = addDays(prevEnd, -(lengthInDays - 1));

  return {
    start: prevStart,
    end: prevEnd,
  };
}

/**
 * Compares current vs previous period: (current − previous) ÷ abs(previous) × 100,
 * rounded to a whole percent; returns "New" when previous is 0.
 */
export function percentChange(current: number, previous: number): number | "New" {
  if (previous === 0) {
    return "New";
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// ============================================================================
// 3. Signed Amount (PRD 5.1)
// ============================================================================

/**
 * Signed amount: income +, expense −, giving −.
 */
export function signedAmount(
  row: Pick<EntryRow, "kind" | "amount_minor">,
): number {
  if (row.kind === "income") {
    return row.amount_minor;
  }
  return -row.amount_minor;
}

// ============================================================================
// 4. Loan Functions (PRD 5.2)
// ============================================================================

/**
 * Interest: percent → principal × basis points ÷ 10,000, rounded to nearest minor unit;
 * flat → value as entered; none → 0.
 */
export function interestAmount(
  principal_minor: number,
  interest_type: InterestKind,
  interest_value: number,
): number {
  if (interest_type === "percent") {
    return Math.round((principal_minor * interest_value) / 10000);
  }
  if (interest_type === "flat") {
    return interest_value;
  }
  return 0;
}

/**
 * Total to get back = principal + interest.
 */
export function totalToGetBack(
  principal_minor: number,
  interest_type: InterestKind,
  interest_value: number,
): number {
  return principal_minor + interestAmount(principal_minor, interest_type, interest_value);
}

/**
 * Received so far = sum of the loan's payments (all time).
 */
export function receivedSoFar(
  payments: Array<Pick<LoanPaymentRow, "amount_minor" | "deleted_at">>,
): number {
  let sum = 0;
  for (const p of payments) {
    if (p.deleted_at === null || p.deleted_at === undefined) {
      sum += p.amount_minor;
    }
  }
  return sum;
}

/**
 * Balance left = max(Total to get back − Received so far, 0).
 */
export function balanceLeft(totalToGetBackVal: number, receivedSoFarVal: number): number {
  return Math.max(totalToGetBackVal - receivedSoFarVal, 0);
}

/**
 * Instalment count n = number of whole weeks (Weekly) or calendar months (Monthly)
 * from started_on to due_on, minimum 1. For one_payment, returns 1.
 */
export function instalmentCount(
  started_on: string,
  due_on: string,
  plan: RepeatPlan,
): number {
  if (plan === "one_payment") {
    return 1;
  }

  if (plan === "weekly") {
    const days = diffInDays(started_on, due_on);
    return Math.max(1, Math.floor(days / 7));
  }

  if (plan === "monthly") {
    const [startYear, startMonth, startDay] = started_on.split("-").map(Number);
    const [dueYear, dueMonth, dueDay] = due_on.split("-").map(Number);

    let months = (dueYear - startYear) * 12 + (dueMonth - startMonth);
    if (dueDay < startDay) {
      months -= 1;
    }
    return Math.max(1, months);
  }

  return 1;
}

/**
 * Suggested instalment = Total to get back ÷ n, rounded up to a whole major unit
 * (multiple of 100 minor).
 */
export function suggestedInstalment(totalToGetBackVal: number, n: number): number {
  const count = Math.max(1, n);
  const rawInstalment = totalToGetBackVal / count;
  return Math.ceil(rawInstalment / 100) * 100;
}

/**
 * Instalment date k (k = 1..n) = started_on + k weeks or months; the last one is always due_on.
 * For One payment, the only date is due_on.
 */
export function instalmentDates(
  started_on: string,
  due_on: string,
  plan: RepeatPlan,
): string[] {
  if (plan === "one_payment") {
    return [due_on];
  }

  const n = instalmentCount(started_on, due_on, plan);
  const dates: string[] = [];

  for (let k = 1; k <= n; k++) {
    if (k === n) {
      dates.push(due_on);
    } else if (plan === "weekly") {
      dates.push(addDays(started_on, k * 7));
    } else if (plan === "monthly") {
      dates.push(addMonths(started_on, k));
    }
  }

  return dates;
}

/**
 * Next expected date = the earliest instalment date k where k × instalment
 * (capped at Total to get back) is greater than Received so far.
 * Returns null if loan is already fully paid.
 */
export function nextExpectedDate(
  loan: {
    started_on: string;
    due_on: string;
    plan: RepeatPlan;
    principal_minor: number;
    interest_type: InterestKind;
    interest_value: number;
    instalment_minor?: number | null;
  },
  payments: Array<Pick<LoanPaymentRow, "amount_minor" | "deleted_at">>,
): string | null {
  const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
  const received = receivedSoFar(payments);

  if (received >= total) {
    return null;
  }

  const n = instalmentCount(loan.started_on, loan.due_on, loan.plan);
  const instalment = loan.instalment_minor ?? suggestedInstalment(total, n);
  const dates = instalmentDates(loan.started_on, loan.due_on, loan.plan);

  for (let k = 1; k <= dates.length; k++) {
    const expectedCumulative = Math.min(k * instalment, total);
    if (expectedCumulative > received) {
      return dates[k - 1];
    }
  }

  return loan.due_on;
}

/**
 * Status, first match wins:
 * Paid off (Balance left = 0) →
 * Overdue (today is after Next expected date) →
 * Due soon (Next expected date within 7 days) →
 * Active.
 */
export function loanStatus(
  today: string,
  loan: {
    started_on: string;
    due_on: string;
    plan: RepeatPlan;
    principal_minor: number;
    interest_type: InterestKind;
    interest_value: number;
    instalment_minor?: number | null;
  },
  payments: Array<Pick<LoanPaymentRow, "amount_minor" | "deleted_at">>,
): LoanStatus {
  const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
  const received = receivedSoFar(payments);
  const balance = balanceLeft(total, received);

  // 1. Paid off
  if (balance === 0) {
    return "Paid off";
  }

  const nextDate = nextExpectedDate(loan, payments);
  if (!nextDate) {
    return "Paid off";
  }

  // 2. Overdue: today is strictly after Next expected date
  if (today > nextDate) {
    return "Overdue";
  }

  // 3. Due soon: Next expected date is within 7 days from today
  const daysUntilExpected = diffInDays(today, nextDate);
  if (daysUntilExpected >= 0 && daysUntilExpected <= 7) {
    return "Due soon";
  }

  // 4. Active
  return "Active";
}

/**
 * Progress bar = Received so far ÷ Total to get back (clamped between 0 and 1).
 */
export function loanProgress(totalToGetBackVal: number, receivedSoFarVal: number): number {
  if (totalToGetBackVal <= 0) return 1;
  const ratio = receivedSoFarVal / totalToGetBackVal;
  return Math.min(Math.max(ratio, 0), 1);
}

/**
 * Generates the countdown text for a loan row:
 * - "Paid off" if status is Paid off or nextDate is null
 * - "Due in X days" / "Due in 1 day" / "Due today"
 * - "X days overdue" / "1 day overdue"
 */
export function loanCountdown(
  today: string,
  nextDate: string | null,
  status: LoanStatus,
): string {
  if (status === "Paid off" || !nextDate) {
    return "Paid off";
  }
  const diff = diffInDays(today, nextDate);
  if (diff > 1) {
    return `Due in ${diff} days`;
  }
  if (diff === 1) {
    return "Due in 1 day";
  }
  if (diff === 0) {
    return "Due today";
  }
  const overdueDays = Math.abs(diff);
  if (overdueDays === 1) {
    return "1 day overdue";
  }
  return `${overdueDays} days overdue`;
}

// ============================================================================
// 5. Habit Functions (PRD 5.3)
// ============================================================================

/**
 * Share = category total ÷ Expenses for P, whole percent.
 */
export function categoryShare(
  categoryExpenseTotal: number,
  totalExpensesInPeriod: number,
): number {
  if (totalExpensesInPeriod <= 0) return 0;
  return Math.round((categoryExpenseTotal / totalExpensesInPeriod) * 100);
}

/**
 * Trend = monthly totals for the last 6 calendar months including the current one.
 */
export function sixMonthTrend(
  category_id: string,
  entries: Array<Pick<EntryRow, "category_id" | "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  currentMonthIso: string, // YYYY-MM
): Array<{ month: string; amount_minor: number }> {
  const [currY, currM] = currentMonthIso.split("-").map(Number);
  const months: string[] = [];

  // Generate 6 months ending in currentMonthIso
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(Date.UTC(currY, currM - 1 - i, 1));
    const y = targetDate.getUTCFullYear();
    const m = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }

  return months.map((month) => {
    let sum = 0;
    for (const e of entries) {
      if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
      if (e.kind === "expense" && e.category_id === category_id && e.occurred_on.startsWith(month)) {
        sum += e.amount_minor;
      }
    }
    return { month, amount_minor: sum };
  });
}

/**
 * Count = number of entries in P; Average = total ÷ count.
 */
export function countAndAverage(
  categoryEntriesInPeriod: Array<Pick<EntryRow, "amount_minor" | "deleted_at">>,
): { count: number; average: number } {
  let count = 0;
  let total = 0;

  for (const e of categoryEntriesInPeriod) {
    if (e.deleted_at === null || e.deleted_at === undefined) {
      count++;
      total += e.amount_minor;
    }
  }

  return {
    count,
    average: count === 0 ? 0 : Math.round(total / count),
  };
}

/**
 * Busiest weekday = weekday with the highest summed amount in P
 * (ties: earliest in the week, Monday first).
 */
export function busiestWeekday(
  categoryEntriesInPeriod: Array<Pick<EntryRow, "amount_minor" | "occurred_on" | "deleted_at">>,
): string | null {
  const activeEntries = categoryEntriesInPeriod.filter(
    (e) => e.deleted_at === null || e.deleted_at === undefined,
  );

  if (activeEntries.length === 0) {
    return null;
  }

  // Monday (0) to Sunday (6)
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const sums = [0, 0, 0, 0, 0, 0, 0];

  for (const e of activeEntries) {
    const d = parseDateUtc(e.occurred_on);
    // getUTCDay: 0 = Sun, 1 = Mon ... 6 = Sat
    const day = d.getUTCDay();
    // Map to Monday = 0 ... Sunday = 6
    const index = (day + 6) % 7;
    sums[index] += e.amount_minor;
  }

  let maxIndex = 0;
  let maxSum = sums[0];

  for (let i = 1; i < 7; i++) {
    // Strict > ensures ties go to earliest in the week (Monday first)
    if (sums[i] > maxSum) {
      maxSum = sums[i];
      maxIndex = i;
    }
  }

  return weekdays[maxIndex];
}

/**
 * Biggest entry = the single largest entry in P.
 */
export function biggestEntry<T extends Pick<EntryRow, "amount_minor" | "deleted_at">>(
  categoryEntriesInPeriod: T[],
): T | null {
  let largest: T | null = null;

  for (const e of categoryEntriesInPeriod) {
    if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
    if (largest === null || e.amount_minor > largest.amount_minor) {
      largest = e;
    }
  }

  return largest;
}

/**
 * Habit label uses whole calendar months:
 * M0 = this month so far,
 * M1 and M2 = the two months before,
 * A = average of M1, M2 and the month before M2 (M3).
 *
 * First match wins:
 * Spike if A > 0 and M0 ≥ 2 × A;
 * Rising if M0 > 1.15 × M1 and M1 > 1.15 × M2;
 * Falling if M0 < 0.85 × M1 and M1 < 0.85 × M2;
 * otherwise Steady.
 * Categories with fewer than 3 entries over those 4 months show "Not enough data yet".
 */
export function habitLabel(
  m0: number,
  m1: number,
  m2: number,
  m3: number,
  entryCountOver4Months: number,
): HabitLabel {
  if (entryCountOver4Months < 3) {
    return "Not enough data yet";
  }

  const A = (m1 + m2 + m3) / 3;

  // 1. Spike: A > 0 and M0 >= 2 * A
  if (A > 0 && m0 >= 2 * A) {
    return "Spike";
  }

  // 2. Rising: M0 > 1.15 * M1 and M1 > 1.15 * M2
  if (m0 > 1.15 * m1 && m1 > 1.15 * m2) {
    return "Rising";
  }

  // 3. Falling: M0 < 0.85 * M1 and M1 < 0.85 * M2
  if (m0 < 0.85 * m1 && m1 < 0.85 * m2) {
    return "Falling";
  }

  // 4. Steady
  return "Steady";
}

/**
 * Habits summary = the 3 categories with the largest rise and the 3 with the largest fall
 * from M1 to M0 (in amount), each as a sentence:
 * "You spent 18% more on Food this month (₦42,500 vs ₦36,000)."
 */
export function habitsSummary(
  categories: Array<{ id: string; name: string }>,
  entries: Array<Pick<EntryRow, "category_id" | "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  currentMonthIso: string, // YYYY-MM
  currency = "NGN",
): {
  rising: Array<{ categoryId: string; sentence: string; diffAmount: number; percent: number }>;
  falling: Array<{ categoryId: string; sentence: string; diffAmount: number; percent: number }>;
} {
  const [currY, currM] = currentMonthIso.split("-").map(Number);
  const m0Iso = currentMonthIso;
  const m1Date = new Date(Date.UTC(currY, currM - 2, 1));
  const m1Iso = `${m1Date.getUTCFullYear()}-${String(m1Date.getUTCMonth() + 1).padStart(2, "0")}`;

  const categoryTotals: Array<{
    categoryId: string;
    name: string;
    m0: number;
    m1: number;
    diff: number; // m0 - m1
  }> = [];

  for (const cat of categories) {
    let m0Total = 0;
    let m1Total = 0;

    for (const e of entries) {
      if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
      if (e.kind === "expense" && e.category_id === cat.id) {
        if (e.occurred_on.startsWith(m0Iso)) {
          m0Total += e.amount_minor;
        } else if (e.occurred_on.startsWith(m1Iso)) {
          m1Total += e.amount_minor;
        }
      }
    }

    categoryTotals.push({
      categoryId: cat.id,
      name: cat.name,
      m0: m0Total,
      m1: m1Total,
      diff: m0Total - m1Total,
    });
  }

  // Rising categories (diff > 0, m1 > 0)
  const risingCandidates = categoryTotals
    .filter((c) => c.diff > 0 && c.m1 > 0)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3)
    .map((c) => {
      const pct = Math.round((c.diff / c.m1) * 100);
      const sentence = `You spent ${pct}% more on ${c.name} this month (${formatMoney(c.m0, currency)} vs ${formatMoney(c.m1, currency)}).`;
      return { categoryId: c.categoryId, sentence, diffAmount: c.diff, percent: pct };
    });

  // Falling categories (diff < 0, m1 > 0)
  const fallingCandidates = categoryTotals
    .filter((c) => c.diff < 0 && c.m1 > 0)
    .sort((a, b) => a.diff - b.diff) // Most negative diff first
    .slice(0, 3)
    .map((c) => {
      const fallAmount = Math.abs(c.diff);
      const pct = Math.round((fallAmount / c.m1) * 100);
      const sentence = `You spent ${pct}% less on ${c.name} this month (${formatMoney(c.m0, currency)} vs ${formatMoney(c.m1, currency)}).`;
      return { categoryId: c.categoryId, sentence, diffAmount: fallAmount, percent: pct };
    });

  return {
    rising: risingCandidates,
    falling: fallingCandidates,
  };
}

/**
 * Smart tip on the dashboard = the summary sentence with the largest absolute percent change
 * among categories that are at least 5% of Expenses;
 * if none qualify, "You're on track. Keep recording to see your habits."
 */
export function smartTip(
  categories: Array<{ id: string; name: string }>,
  entries: Array<Pick<EntryRow, "category_id" | "kind" | "amount_minor" | "occurred_on" | "deleted_at">>,
  currentMonthIso: string,
  currency = "NGN",
): string {
  // Total expenses in M0
  let totalM0Expenses = 0;
  for (const e of entries) {
    if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
    if (e.kind === "expense" && e.occurred_on.startsWith(currentMonthIso)) {
      totalM0Expenses += e.amount_minor;
    }
  }

  if (totalM0Expenses === 0) {
    return "You're on track. Keep recording to see your habits.";
  }

  const summary = habitsSummary(categories, entries, currentMonthIso, currency);
  const allSentences = [...summary.rising, ...summary.falling];

  let bestSentence: string | null = null;
  let maxPercent = -1;

  for (const item of allSentences) {
    // Check if category is at least 5% of Expenses in M0
    let catM0 = 0;
    for (const e of entries) {
      if (e.deleted_at !== null && e.deleted_at !== undefined) continue;
      if (
        e.kind === "expense" &&
        e.category_id === item.categoryId &&
        e.occurred_on.startsWith(currentMonthIso)
      ) {
        catM0 += e.amount_minor;
      }
    }

    const share = (catM0 / totalM0Expenses) * 100;
    if (share >= 5) {
      if (item.percent > maxPercent) {
        maxPercent = item.percent;
        bestSentence = item.sentence;
      }
    }
  }

  return bestSentence ?? "You're on track. Keep recording to see your habits.";
}

// ============================================================================
// 6. Period Presets Helper (PRD 5.1 & Prompt 6)
// ============================================================================

export type PeriodPreset =
  | "thisWeek"
  | "thisMonth"
  | "last3Months"
  | "thisYear"
  | "custom";

/**
 * Period presets helper:
 * - thisWeek: Monday start of current week to Sunday end of current week
 * - thisMonth: 1st of month to last day of month
 * - last3Months: 1st of 2 months ago to last day of current month
 * - thisYear: Jan 1 of year to Dec 31 of year
 * - custom: returns provided or defaults to thisMonth
 */
export function getPeriodPreset(
  preset: PeriodPreset,
  referenceDate: Date | string = new Date(),
  customRange?: DatePeriod,
): DatePeriod {
  const ref =
    typeof referenceDate === "string"
      ? new Date(`${referenceDate}T00:00:00Z`)
      : referenceDate;
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // 0-indexed
  const d = ref.getUTCDate();

  switch (preset) {
    case "thisWeek": {
      // Monday start
      const dayOfWeek = ref.getUTCDay(); // 0 is Sun, 1 is Mon
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(Date.UTC(y, m, d - diffToMonday));
      const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
      return {
        start: formatDateUtc(monday),
        end: formatDateUtc(sunday),
      };
    }

    case "thisMonth": {
      const firstDay = new Date(Date.UTC(y, m, 1));
      const lastDay = new Date(Date.UTC(y, m + 1, 0));
      return {
        start: formatDateUtc(firstDay),
        end: formatDateUtc(lastDay),
      };
    }

    case "last3Months": {
      const firstDay = new Date(Date.UTC(y, m - 2, 1));
      const lastDay = new Date(Date.UTC(y, m + 1, 0));
      return {
        start: formatDateUtc(firstDay),
        end: formatDateUtc(lastDay),
      };
    }

    case "thisYear": {
      const firstDay = new Date(Date.UTC(y, 0, 1));
      const lastDay = new Date(Date.UTC(y, 11, 31));
      return {
        start: formatDateUtc(firstDay),
        end: formatDateUtc(lastDay),
      };
    }

    case "custom": {
      if (customRange) {
        return customRange;
      }
      const firstDay = new Date(Date.UTC(y, m, 1));
      const lastDay = new Date(Date.UTC(y, m + 1, 0));
      return {
        start: formatDateUtc(firstDay),
        end: formatDateUtc(lastDay),
      };
    }
  }
}
