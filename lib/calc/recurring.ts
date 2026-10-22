import type { RecurringRuleRow, RepeatPlan } from "@/lib/db/dexie";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * Computes the next due date for a recurring rule given the current due date and frequency.
 *
 * Safe for end-of-month and leap years:
 * - 31-01 -> 28-02 (common year) or 29-02 (leap year)
 * - 31-03 -> 30-04
 * - 31-05 -> 30-06
 * - 31-08 -> 30-09
 * - 31-10 -> 30-11
 * - Weekly: exactly + 7 days
 *
 * @param currentDateIso - Date in "YYYY-MM-DD" format (or ISO string with time)
 * @param frequency - "weekly" | "monthly" | "Weekly" | "Monthly" | RepeatPlan
 */
export function computeNextDueDate(
  currentDateIso: string,
  frequency: "weekly" | "monthly" | "Weekly" | "Monthly" | RepeatPlan,
): string {
  const normFreq = frequency.toLowerCase();
  const dateOnly = currentDateIso.slice(0, 10);
  const [yearStr, monthStr, dayStr] = dateOnly.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (normFreq === "weekly") {
    // Add 7 days in UTC
    const dateUtc = new Date(Date.UTC(year, month - 1, day));
    dateUtc.setUTCDate(dateUtc.getUTCDate() + 7);
    const nextYear = dateUtc.getUTCFullYear();
    const nextMonth = String(dateUtc.getUTCMonth() + 1).padStart(2, "0");
    const nextDay = String(dateUtc.getUTCDate()).padStart(2, "0");
    return `${nextYear}-${nextMonth}-${nextDay}`;
  }

  if (normFreq === "monthly") {
    // Determine target year and month (1-based)
    const targetYear = month === 12 ? year + 1 : year;
    const targetMonth = month === 12 ? 1 : month + 1;

    // Days in target month (day 0 of next month in UTC gives last day of target month)
    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();

    // End-of-month clamp (e.g. 31st clamped to 28, 29, or 30)
    const targetDay = Math.min(day, daysInTargetMonth);

    const padYear = String(targetYear);
    const padMonth = String(targetMonth).padStart(2, "0");
    const padDay = String(targetDay).padStart(2, "0");
    return `${padYear}-${padMonth}-${padDay}`;
  }

  throw new Error(`Unsupported frequency: ${frequency}`);
}

/**
 * Filters and returns recurring rules that are active (not paused, not deleted)
 * and currently due (next_due_on <= today).
 * Sorted by next_due_on ascending.
 */
export function getDueRecurringRules(
  rules: RecurringRuleRow[],
  todayIso?: string,
): RecurringRuleRow[] {
  const today = todayIso ? todayIso.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return rules
    .filter((rule) => {
      if (rule.is_paused) return false;
      if (rule.deleted_at !== null) return false;
      return rule.next_due_on <= today;
    })
    .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
}

/**
 * Returns formatted banner message and state for a due recurring rule.
 * E.g. "Rent ₦150,000.00 is due today. Add it?" or "Rent ₦150,000.00 was due on 20-10-2026. Add it?"
 */
export function getRecurringBannerMessage(
  rule: RecurringRuleRow,
  categoryName?: string,
  currency = "NGN",
  todayIso?: string,
): { message: string; isPastDue: boolean; displayName: string; formattedAmount: string } {
  const today = todayIso ? todayIso.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const displayName =
    rule.description?.trim() || rule.counterparty?.trim() || categoryName || "Entry";
  const formattedAmount = formatMoney(rule.amount_minor, currency);
  const isPastDue = rule.next_due_on < today;

  const message = isPastDue
    ? `${displayName} ${formattedAmount} was due on ${formatDate(rule.next_due_on)}. Add it?`
    : `${displayName} ${formattedAmount} is due today. Add it?`;

  return {
    message,
    isPastDue,
    displayName,
    formattedAmount,
  };
}
