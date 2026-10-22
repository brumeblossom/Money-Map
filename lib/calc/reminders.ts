import type { LoanRow, LoanPaymentRow, RecurringRuleRow, CategoryRow } from "@/lib/db/dexie";
import {
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  nextExpectedDate,
  instalmentCount,
  suggestedInstalment,
  diffInDays,
} from "./index";
import { formatMoney, formatDate } from "@/lib/format";
import { getDueRecurringRules, getRecurringBannerMessage } from "./recurring";

export interface DueLoanItem {
  loanId: string;
  counterparty: string;
  expectedDate: string; // YYYY-MM-DD
  formattedExpectedDate: string; // DD-MM-YYYY
  dueAmountMinor: number;
  balanceMinor: number;
  isOverdue: boolean;
  message: string;
  href: string;
}

export interface DueReminderSummary {
  dueLoans: DueLoanItem[];
  dueRecurringRules: RecurringRuleRow[];
  hasDueItems: boolean;
}

/**
 * Finds all active loans with:
 * - remind = true (default true)
 * - balance > 0 (not paid off)
 * - expected date within 3 days from today or overdue (diffInDays(today, nextDate) <= 3)
 */
export function getDueLoans({
  loans,
  loanPayments,
  todayIso,
  currency = "NGN",
}: {
  loans: LoanRow[];
  loanPayments: LoanPaymentRow[];
  todayIso: string;
  currency?: string;
}): DueLoanItem[] {
  const today = todayIso.slice(0, 10);
  const items: DueLoanItem[] = [];

  for (const loan of loans) {
    if (loan.deleted_at !== null) continue;
    // Remind me on (default true)
    if (loan.remind === false) continue;

    const payments = loanPayments.filter(
      (p) => p.deleted_at === null && p.loan_id === loan.id,
    );

    const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
    const received = receivedSoFar(payments);
    const balance = balanceLeft(total, received);

    // Must have balance > 0
    if (balance <= 0) continue;

    const nextDate = nextExpectedDate(loan, payments);
    if (!nextDate) continue;

    // Expected date within 3 days or overdue
    const daysUntilDue = diffInDays(today, nextDate);
    if (daysUntilDue > 3) continue;

    // Calculate due instalment amount capped at remaining balance
    let dueAmount: number;
    if (loan.plan === "one_payment") {
      dueAmount = balance;
    } else {
      const n = instalmentCount(loan.started_on, loan.due_on, loan.plan);
      const instalment = loan.instalment_minor ?? suggestedInstalment(total, n);
      dueAmount = Math.min(instalment, balance);
    }

    const formattedAmount = formatMoney(dueAmount, currency);
    const formattedExpectedDate = formatDate(nextDate);
    const message = `${loan.counterparty} is due to pay back ${formattedAmount} on ${formattedExpectedDate}`;

    items.push({
      loanId: loan.id,
      counterparty: loan.counterparty,
      expectedDate: nextDate,
      formattedExpectedDate,
      dueAmountMinor: dueAmount,
      balanceMinor: balance,
      isOverdue: nextDate < today,
      message,
      href: `/lent/${loan.id}`,
    });
  }

  // Sort by expectedDate ascending
  return items.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
}

/**
 * Computes all items due for a user (loans and recurring entries).
 * Works offline on device and on server cron.
 */
export function computeDueReminders({
  loans,
  loanPayments,
  recurringRules,
  todayIso,
  currency = "NGN",
}: {
  loans: LoanRow[];
  loanPayments: LoanPaymentRow[];
  recurringRules: RecurringRuleRow[];
  todayIso: string;
  currency?: string;
}): DueReminderSummary {
  const dueLoans = getDueLoans({ loans, loanPayments, todayIso, currency });
  const dueRecurringRules = getDueRecurringRules(recurringRules, todayIso);

  return {
    dueLoans,
    dueRecurringRules,
    hasDueItems: dueLoans.length > 0 || dueRecurringRules.length > 0,
  };
}

/**
 * Constructs HTML email content for a user's daily reminders.
 */
export function buildReminderEmailHtml({
  userEmail,
  profile,
  dueLoans,
  dueRules,
  categories,
  todayIso,
}: {
  userEmail: string;
  profile: { currency?: string | null };
  dueLoans: DueLoanItem[];
  dueRules: RecurringRuleRow[];
  categories: CategoryRow[];
  todayIso: string;
}): string {
  const currency = profile.currency || "NGN";
  const dateFormatted = formatDate(todayIso);

  const loanItemsHtml = dueLoans
    .map(
      (item) => `
      <li style="margin-bottom: 8px; padding: 10px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <strong>Money I lent:</strong> ${item.message}
      </li>`,
    )
    .join("");

  const ruleItemsHtml = dueRules
    .map((rule) => {
      const cat = categories.find((c) => c.id === rule.category_id);
      const { message } = getRecurringBannerMessage(rule, cat?.name, currency, todayIso);
      return `
      <li style="margin-bottom: 8px; padding: 10px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <strong>Repeating entry:</strong> ${message}
      </li>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Money Map Reminders</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0;">Money Map Daily Reminders</h1>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            Here are your reminders for <strong>${dateFormatted}</strong>:
          </p>

          ${
            dueLoans.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 8px;">Money owed to you</h2>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${loanItemsHtml}
              </ul>
            </div>`
              : ""
          }

          ${
            dueRules.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 8px;">Repeating entries due</h2>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${ruleItemsHtml}
              </ul>
            </div>`
              : ""
          }

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0;">This email was sent to ${userEmail} because "Email me a daily reminder" is enabled in your Money Map settings.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

