import { describe, it, expect } from "vitest";
import {
  periodTotals,
  owedToMe,
  previousPeriod,
  percentChange,
  signedAmount,
  interestAmount,
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  instalmentCount,
  suggestedInstalment,
  instalmentDates,
  nextExpectedDate,
  loanStatus,
  loanProgress,
  loanCountdown,
  categoryShare,
  sixMonthTrend,
  countAndAverage,
  busiestWeekday,
  biggestEntry,
  habitLabel,
  habitsSummary,
  smartTip,
  getPeriodPreset,
  getMonthPeriod,
  diffInDays,
} from "@/lib/calc";

describe("Calculation Engine (PRD Section 5)", () => {
  // -------------------------------------------------------------
  // 1. Period Totals & Owed to Me (PRD 5.1)
  // -------------------------------------------------------------
  describe("periodTotals & owedToMe", () => {
    it("handles empty data cleanly with zero totals", () => {
      const totals = periodTotals([], { start: "2026-10-01", end: "2026-10-31" });
      expect(totals).toEqual({
        moneyIn: 0,
        expenses: 0,
        giving: 0,
        moneyOut: 0,
        leftOver: 0,
      });
    });

    it("calculates moneyIn, expenses, giving, moneyOut and leftOver correctly", () => {
      const entries = [
        { kind: "income" as const, amount_minor: 15000000, occurred_on: "2026-10-05", deleted_at: null },
        { kind: "income" as const, amount_minor: 5000000, occurred_on: "2026-10-15", deleted_at: null },
        { kind: "expense" as const, amount_minor: 6000000, occurred_on: "2026-10-10", deleted_at: null },
        { kind: "giving" as const, amount_minor: 2000000, occurred_on: "2026-10-12", deleted_at: null },
        // Ignored: outside period
        { kind: "expense" as const, amount_minor: 9999999, occurred_on: "2026-09-30", deleted_at: null },
        // Ignored: soft-deleted
        { kind: "income" as const, amount_minor: 8888888, occurred_on: "2026-10-20", deleted_at: "2026-10-20T10:00:00Z" },
      ];

      const totals = periodTotals(entries, { start: "2026-10-01", end: "2026-10-31" });
      expect(totals.moneyIn).toBe(20000000); // 15000000 + 5000000
      expect(totals.expenses).toBe(6000000);
      expect(totals.giving).toBe(2000000);
      expect(totals.moneyOut).toBe(8000000);  // 6000000 + 2000000
      expect(totals.leftOver).toBe(12000000); // 20000000 - 8000000
    });

    it("strictly uses occurred_on (not created_at) so an entry dated last month belongs to last month", () => {
      // Entry was created in October (e.g. today 2026-10-21), but occurred_on is in September (2026-09-15)
      const septEntry = {
        kind: "income" as const,
        amount_minor: 5000000,
        occurred_on: "2026-09-15",
        deleted_at: null,
      };

      const octEntry = {
        kind: "income" as const,
        amount_minor: 8000000,
        occurred_on: "2026-10-05",
        deleted_at: null,
      };

      const entries = [septEntry, octEntry];

      // October totals: only includes octEntry
      const octPeriod = getMonthPeriod("2026-10");
      const octTotals = periodTotals(entries, octPeriod);
      expect(octTotals.moneyIn).toBe(8000000);

      // September totals: only includes septEntry
      const septPeriod = getMonthPeriod("2026-09");
      const septTotals = periodTotals(entries, septPeriod);
      expect(septTotals.moneyIn).toBe(5000000);
    });

    it("calculates owedToMe across all active loans (not limited to period P)", () => {
      // Empty loans
      expect(owedToMe([], [])).toBe(0);

      const loans = [
        // Loan 1: 100,000 principal, no interest, 40,000 received -> 60,000 balance
        { id: "loan-1", principal_minor: 100000, interest_type: "none" as const, interest_value: 0, deleted_at: null },
        // Loan 2: 200,000 principal, 50,000 flat interest, 250,000 received -> 0 balance (Paid off)
        { id: "loan-2", principal_minor: 200000, interest_type: "flat" as const, interest_value: 50000, deleted_at: null },
        // Loan 3: soft-deleted -> ignored
        { id: "loan-3", principal_minor: 500000, interest_type: "none" as const, interest_value: 0, deleted_at: "2026-10-01" },
      ];

      const payments = [
        { loan_id: "loan-1", amount_minor: 40000, deleted_at: null },
        { loan_id: "loan-2", amount_minor: 250000, deleted_at: null },
        { loan_id: "loan-1", amount_minor: 99999, deleted_at: "2026-10-05" }, // soft-deleted payment ignored
      ];

      expect(owedToMe(loans, payments)).toBe(60000);
    });
  });

  // -------------------------------------------------------------
  // 2. Previous Period & Percent Change (PRD 5.1)
  // -------------------------------------------------------------
  describe("previousPeriod & percentChange", () => {
    it("returns period of equal length ending the day before current starts", () => {
      // 7-day period: 2026-10-08 to 2026-10-14 (length = 7 days)
      const p1 = { start: "2026-10-08", end: "2026-10-14" };
      const prev1 = previousPeriod(p1);
      expect(prev1).toEqual({ start: "2026-10-01", end: "2026-10-07" });
      expect(diffInDays(prev1.start, prev1.end) + 1).toBe(7);

      // 31-day period: 2026-10-01 to 2026-10-31 (length = 31 days)
      const p2 = { start: "2026-10-01", end: "2026-10-31" };
      const prev2 = previousPeriod(p2);
      expect(prev2).toEqual({ start: "2026-08-31", end: "2026-09-30" });
      expect(diffInDays(prev2.start, prev2.end) + 1).toBe(31);
    });

    it("returns 'New' when previous period is 0", () => {
      expect(percentChange(150000, 0)).toBe("New");
    });

    it("calculates percent change correctly rounded to whole percent", () => {
      // Increase: 200 -> 250 (+25%)
      expect(percentChange(250, 200)).toBe(25);
      // Decrease: 200 -> 150 (-25%)
      expect(percentChange(150, 200)).toBe(-25);
      // Rounding: 300 -> 355 (+18.33% -> 18%)
      expect(percentChange(355, 300)).toBe(18);
    });
  });

  // -------------------------------------------------------------
  // 3. Signed Amount (PRD 5.1)
  // -------------------------------------------------------------
  describe("signedAmount", () => {
    it("returns positive for income, negative for expense and giving", () => {
      expect(signedAmount({ kind: "income", amount_minor: 5000 })).toBe(5000);
      expect(signedAmount({ kind: "expense", amount_minor: 5000 })).toBe(-5000);
      expect(signedAmount({ kind: "giving", amount_minor: 5000 })).toBe(-5000);
    });
  });

  // -------------------------------------------------------------
  // 4. Money I Lent (PRD 5.2)
  // -------------------------------------------------------------
  describe("Loan calculations (PRD 5.2)", () => {
    it("calculates interest correctly for none, flat, and percent", () => {
      // none
      expect(interestAmount(100000, "none", 0)).toBe(0);
      // flat
      expect(interestAmount(100000, "flat", 15000)).toBe(15000);
      // percent: 100,000 kobo at 500 basis points (5%) = 5,000 kobo
      expect(interestAmount(100000, "percent", 500)).toBe(5000);
      // percent rounding: 33,333 kobo at 750 bps (7.5%) = 2499.975 -> 2500
      expect(interestAmount(33333, "percent", 750)).toBe(2500);
    });

    it("calculates totalToGetBack and receivedSoFar", () => {
      expect(totalToGetBack(100000, "percent", 1000)).toBe(110000); // 100k + 10k
      expect(receivedSoFar([])).toBe(0);
      expect(
        receivedSoFar([
          { amount_minor: 25000, deleted_at: null },
          { amount_minor: 15000, deleted_at: null },
          { amount_minor: 99999, deleted_at: "2026-10-01" }, // deleted ignored
        ]),
      ).toBe(40000);
    });

    it("clamps balanceLeft to 0 on overpayment", () => {
      expect(balanceLeft(100000, 40000)).toBe(60000);
      expect(balanceLeft(100000, 100000)).toBe(0);
      expect(balanceLeft(100000, 120000)).toBe(0); // overpayment clamps to 0
    });

    it("calculates instalmentCount and suggestedInstalment for weekly plan", () => {
      // 3 weeks: 2026-10-01 to 2026-10-22 (21 days)
      const count = instalmentCount("2026-10-01", "2026-10-22", "weekly");
      expect(count).toBe(3);

      // suggestedInstalment rounded up to multiple of 100 minor
      // Total 100,000 / 3 = 33,333.33 -> rounded up to next multiple of 100 = 33,400
      expect(suggestedInstalment(100000, 3)).toBe(33400);
    });

    it("calculates instalmentCount for a monthly plan whose due date is mid-month", () => {
      // 2026-01-15 to 2026-03-10:
      // Jan 15 to Feb 15 is 1 month. Feb 15 to Mar 10 is < 1 month.
      // Whole calendar months = 1
      expect(instalmentCount("2026-01-15", "2026-03-10", "monthly")).toBe(1);

      // 2026-01-15 to 2026-04-15 = 3 months
      expect(instalmentCount("2026-01-15", "2026-04-15", "monthly")).toBe(3);

      // Minimum 1 week or 1 month
      expect(instalmentCount("2026-01-01", "2026-01-03", "weekly")).toBe(1);
      expect(instalmentCount("2026-01-01", "2026-01-05", "monthly")).toBe(1);
    });

    it("generates correct instalment dates with last date always being due_on", () => {
      // One payment
      expect(instalmentDates("2026-10-01", "2026-10-31", "one_payment")).toEqual(["2026-10-31"]);

      // Weekly: 3 instalments
      expect(instalmentDates("2026-10-01", "2026-10-22", "weekly")).toEqual([
        "2026-10-08",
        "2026-10-15",
        "2026-10-22",
      ]);

      // Monthly: 2 instalments
      expect(instalmentDates("2026-01-15", "2026-03-15", "monthly")).toEqual([
        "2026-02-15",
        "2026-03-15",
      ]);
    });

    it("calculates nextExpectedDate based on cumulative payments", () => {
      const loan = {
        started_on: "2026-10-01",
        due_on: "2026-10-22",
        plan: "weekly" as const,
        principal_minor: 30000,
        interest_type: "none" as const,
        interest_value: 0,
        instalment_minor: 10000,
      };

      // 0 received: next is 1st instalment (Oct 8)
      expect(nextExpectedDate(loan, [])).toBe("2026-10-08");

      // 10,000 received: satisfies 1st instalment, next is 2nd (Oct 15)
      expect(nextExpectedDate(loan, [{ amount_minor: 10000, deleted_at: null }])).toBe("2026-10-15");

      // 25,000 received: satisfies 1st & 2nd, next is 3rd (Oct 22)
      expect(nextExpectedDate(loan, [{ amount_minor: 25000, deleted_at: null }])).toBe("2026-10-22");

      // 30,000 received: fully paid -> returns null
      expect(nextExpectedDate(loan, [{ amount_minor: 30000, deleted_at: null }])).toBeNull();
    });

    it("evaluates loan status with strict precedence (Paid off beats Overdue)", () => {
      const loan = {
        started_on: "2026-10-01",
        due_on: "2026-10-15",
        plan: "one_payment" as const,
        principal_minor: 50000,
        interest_type: "none" as const,
        interest_value: 0,
      };

      // Today is past due (2026-10-20), but loan is fully paid: 'Paid off' must beat 'Overdue'
      expect(
        loanStatus("2026-10-20", loan, [{ amount_minor: 50000, deleted_at: null }]),
      ).toBe("Paid off");

      // Today is past due, unpaid: 'Overdue'
      expect(loanStatus("2026-10-20", loan, [])).toBe("Overdue");

      // Due within 7 days (today is Oct 10, due is Oct 15): 'Due soon'
      expect(loanStatus("2026-10-10", loan, [])).toBe("Due soon");

      // Due > 7 days ahead (today is Oct 01, due is Oct 15): 'Active'
      expect(loanStatus("2026-10-01", loan, [])).toBe("Active");
    });

    it("calculates loan progress bar clamped between 0 and 1", () => {
      expect(loanProgress(100000, 25000)).toBe(0.25);
      expect(loanProgress(100000, 150000)).toBe(1); // clamped
      expect(loanProgress(0, 0)).toBe(1);
    });

    it("formats loan countdown strings accurately", () => {
      // Due in future
      expect(loanCountdown("2026-10-20", "2026-10-24", "Due soon")).toBe("Due in 4 days");
      expect(loanCountdown("2026-10-20", "2026-10-21", "Due soon")).toBe("Due in 1 day");
      expect(loanCountdown("2026-10-20", "2026-10-20", "Due soon")).toBe("Due today");

      // Overdue
      expect(loanCountdown("2026-10-20", "2026-10-18", "Overdue")).toBe("2 days overdue");
      expect(loanCountdown("2026-10-20", "2026-10-19", "Overdue")).toBe("1 day overdue");

      // Paid off
      expect(loanCountdown("2026-10-20", null, "Paid off")).toBe("Paid off");
      expect(loanCountdown("2026-10-20", "2026-10-25", "Paid off")).toBe("Paid off");
    });

    it("verifies Ada loan scenario: ₦50,000, 2 months, 10% interest, repayments", () => {
      const principal = 5000000; // ₦50,000.00
      const interestRate = 1000; // 10% in basis points
      const interestType = "percent" as const;
      const startedOn = "2026-10-21";
      const dueOn = "2026-12-21";
      const plan = "monthly" as const;

      // 1. Total to get back and suggested instalment
      const interest = interestAmount(principal, interestType, interestRate);
      expect(interest).toBe(500000); // ₦5,000.00
      const total = totalToGetBack(principal, interestType, interestRate);
      expect(total).toBe(5500000); // ₦55,000.00

      const n = instalmentCount(startedOn, dueOn, plan);
      expect(n).toBe(2);

      const suggested = suggestedInstalment(total, n);
      expect(suggested).toBe(2750000); // ₦27,500.00

      const loan = {
        started_on: startedOn,
        due_on: dueOn,
        plan,
        principal_minor: principal,
        interest_type: interestType,
        interest_value: interestRate,
        instalment_minor: suggested,
      };

      // 2. Initial state: balance ₦55,000.00
      let payments: Array<{ amount_minor: number; deleted_at: null }> = [];
      expect(balanceLeft(total, receivedSoFar(payments))).toBe(5500000);
      expect(loanProgress(total, receivedSoFar(payments))).toBe(0);

      // 3. Record ₦27,500 received -> balance ₦27,500.00, progress 50%
      payments = [{ amount_minor: 2750000, deleted_at: null }];
      expect(receivedSoFar(payments)).toBe(2750000);
      expect(balanceLeft(total, receivedSoFar(payments))).toBe(2750000);
      expect(loanProgress(total, receivedSoFar(payments))).toBe(0.5);
      expect(loanStatus("2026-10-21", loan, payments)).toBe("Active");

      // 4. Record another ₦27,500 -> status Paid off, balance ₦0.00, progress 100%
      payments = [
        { amount_minor: 2750000, deleted_at: null },
        { amount_minor: 2750000, deleted_at: null },
      ];
      expect(receivedSoFar(payments)).toBe(5500000);
      expect(balanceLeft(total, receivedSoFar(payments))).toBe(0);
      expect(loanProgress(total, receivedSoFar(payments))).toBe(1);
      expect(loanStatus("2026-10-21", loan, payments)).toBe("Paid off");
    });

    it("identifies a loan expected back 3 days from today as 'Due soon'", () => {
      const today = "2026-10-21";
      const dueOn = "2026-10-24"; // 3 days ahead
      const loan = {
        started_on: "2026-10-01",
        due_on: dueOn,
        plan: "one_payment" as const,
        principal_minor: 1000000,
        interest_type: "none" as const,
        interest_value: 0,
      };

      expect(loanStatus(today, loan, [])).toBe("Due soon");
      expect(loanCountdown(today, dueOn, "Due soon")).toBe("Due in 3 days");
    });
  });

  // -------------------------------------------------------------
  // 5. Habit Reports (PRD 5.3)
  // -------------------------------------------------------------
  describe("Habit reports (PRD 5.3)", () => {
    it("calculates categoryShare as whole percent", () => {
      expect(categoryShare(25000, 100000)).toBe(25);
      expect(categoryShare(0, 0)).toBe(0);
      expect(categoryShare(33333, 100000)).toBe(33);
    });

    it("computes sixMonthTrend including the current month", () => {
      const entries = [
        { category_id: "cat-food", kind: "expense" as const, amount_minor: 50000, occurred_on: "2026-10-05", deleted_at: null },
        { category_id: "cat-food", kind: "expense" as const, amount_minor: 30000, occurred_on: "2026-09-15", deleted_at: null },
        { category_id: "cat-food", kind: "expense" as const, amount_minor: 20000, occurred_on: "2026-05-01", deleted_at: null },
        // Out of 6-month window (April 2026)
        { category_id: "cat-food", kind: "expense" as const, amount_minor: 99999, occurred_on: "2026-04-15", deleted_at: null },
      ];

      const trend = sixMonthTrend("cat-food", entries, "2026-10");
      expect(trend).toHaveLength(6);
      expect(trend.map((t) => t.month)).toEqual([
        "2026-05",
        "2026-06",
        "2026-07",
        "2026-08",
        "2026-09",
        "2026-10",
      ]);
      expect(trend[0].amount_minor).toBe(20000); // 2026-05
      expect(trend[4].amount_minor).toBe(30000); // 2026-09
      expect(trend[5].amount_minor).toBe(50000); // 2026-10
    });

    it("computes countAndAverage for category entries", () => {
      expect(countAndAverage([])).toEqual({ count: 0, average: 0 });

      const entries = [
        { amount_minor: 10000, deleted_at: null },
        { amount_minor: 20000, deleted_at: null },
        { amount_minor: 30000, deleted_at: null },
      ];
      expect(countAndAverage(entries)).toEqual({ count: 3, average: 20000 });
    });

    it("identifies busiestWeekday and resolves ties to earliest in week (Monday first)", () => {
      // Empty entries
      expect(busiestWeekday([])).toBeNull();

      // Clear winner: Tuesday 2026-10-20 has 100,000
      const entries1 = [
        { amount_minor: 100000, occurred_on: "2026-10-20", deleted_at: null }, // Tuesday
        { amount_minor: 50000, occurred_on: "2026-10-21", deleted_at: null },  // Wednesday
      ];
      expect(busiestWeekday(entries1)).toBe("Tuesday");

      // Tie: Monday 2026-10-19 (50,000) and Friday 2026-10-23 (50,000) -> Monday wins!
      const entries2 = [
        { amount_minor: 50000, occurred_on: "2026-10-19", deleted_at: null }, // Monday
        { amount_minor: 50000, occurred_on: "2026-10-23", deleted_at: null }, // Friday
      ];
      expect(busiestWeekday(entries2)).toBe("Monday");
    });

    it("finds biggestEntry in period", () => {
      expect(biggestEntry([])).toBeNull();

      const e1 = { id: "1", amount_minor: 5000, deleted_at: null };
      const e2 = { id: "2", amount_minor: 25000, deleted_at: null };
      const e3 = { id: "3", amount_minor: 12000, deleted_at: null };

      expect(biggestEntry([e1, e2, e3])?.id).toBe("2");
    });

    it("assigns each habitLabel accurately based on PRD 5.3 precedence rules", () => {
      // 1. Not enough data yet: fewer than 3 entries over 4 months
      expect(habitLabel(100, 100, 100, 100, 2)).toBe("Not enough data yet");

      // 2. Spike: A > 0 and M0 >= 2 * A (M1=100, M2=100, M3=100 -> A=100; M0=200 >= 200)
      expect(habitLabel(200, 100, 100, 100, 5)).toBe("Spike");

      // 3. Rising: M0 > 1.15 * M1 and M1 > 1.15 * M2
      // M2=100, M1=120 (>1.15*100=115), M0=145 (>1.15*120=138), A=(120+100+100)/3=106.67, M0 < 2*A (213.3)
      expect(habitLabel(145, 120, 100, 100, 10)).toBe("Rising");

      // 4. Falling: M0 < 0.85 * M1 and M1 < 0.85 * M2
      // M2=100, M1=80 (<85), M0=65 (<0.85*80=68)
      expect(habitLabel(65, 80, 100, 100, 10)).toBe("Falling");

      // 5. Steady: does not match Spike, Rising, or Falling
      expect(habitLabel(100, 100, 100, 100, 10)).toBe("Steady");
    });

    it("generates habitsSummary sentences using formatMoney", () => {
      const categories = [
        { id: "c1", name: "Food" },
        { id: "c2", name: "Transportation" },
      ];

      const entries = [
        // Food: M1 (Sep) = 36,000, M0 (Oct) = 42,500 (+6,500, +18%)
        { category_id: "c1", kind: "expense" as const, amount_minor: 4250000, occurred_on: "2026-10-10", deleted_at: null },
        { category_id: "c1", kind: "expense" as const, amount_minor: 3600000, occurred_on: "2026-09-10", deleted_at: null },
        // Transport: M1 (Sep) = 20,000, M0 (Oct) = 15,000 (-5,000, -25%)
        { category_id: "c2", kind: "expense" as const, amount_minor: 1500000, occurred_on: "2026-10-12", deleted_at: null },
        { category_id: "c2", kind: "expense" as const, amount_minor: 2000000, occurred_on: "2026-09-12", deleted_at: null },
      ];

      const summary = habitsSummary(categories, entries, "2026-10", "NGN");
      expect(summary.rising).toHaveLength(1);
      expect(summary.rising[0].sentence).toBe(
        "You spent 18% more on Food this month (₦42,500.00 vs ₦36,000.00).",
      );

      expect(summary.falling).toHaveLength(1);
      expect(summary.falling[0].sentence).toBe(
        "You spent 25% less on Transportation this month (₦15,000.00 vs ₦20,000.00).",
      );
    });

    it("selects smartTip with largest percent change among >= 5% expenses or falls back", () => {
      const categories = [{ id: "c1", name: "Food" }];

      // Fallback with no data
      expect(smartTip(categories, [], "2026-10", "NGN")).toBe(
        "You're on track. Keep recording to see your habits.",
      );

      const entries = [
        { category_id: "c1", kind: "expense" as const, amount_minor: 4250000, occurred_on: "2026-10-10", deleted_at: null },
        { category_id: "c1", kind: "expense" as const, amount_minor: 3600000, occurred_on: "2026-09-10", deleted_at: null },
      ];

      expect(smartTip(categories, entries, "2026-10", "NGN")).toBe(
        "You spent 18% more on Food this month (₦42,500.00 vs ₦36,000.00).",
      );
    });
  });

  // -------------------------------------------------------------
  // 6. Period Presets Helper (PRD 5.1 & Prompt 6)
  // -------------------------------------------------------------
  describe("getPeriodPreset", () => {
    // Fixed reference date: Wednesday 2026-10-21
    const refDate = new Date("2026-10-21T12:00:00Z");

    it("computes thisWeek with Monday start and Sunday end", () => {
      const week = getPeriodPreset("thisWeek", refDate);
      expect(week).toEqual({
        start: "2026-10-19", // Monday
        end: "2026-10-25",   // Sunday
      });
    });

    it("computes thisMonth from 1st to last day of month", () => {
      const month = getPeriodPreset("thisMonth", refDate);
      expect(month).toEqual({
        start: "2026-10-01",
        end: "2026-10-31",
      });
    });

    it("computes last3Months from 1st of 2 months ago to end of current month", () => {
      const threeMonths = getPeriodPreset("last3Months", refDate);
      expect(threeMonths).toEqual({
        start: "2026-08-01",
        end: "2026-10-31",
      });
    });

    it("computes thisYear from Jan 1 to Dec 31", () => {
      const year = getPeriodPreset("thisYear", refDate);
      expect(year).toEqual({
        start: "2026-01-01",
        end: "2026-12-31",
      });
    });

    it("handles custom preset", () => {
      const custom = getPeriodPreset("custom", refDate, {
        start: "2026-05-01",
        end: "2026-05-15",
      });
      expect(custom).toEqual({
        start: "2026-05-01",
        end: "2026-05-15",
      });

      // custom without customRange fallback
      const customFallback = getPeriodPreset("custom", refDate);
      expect(customFallback).toEqual({
        start: "2026-10-01",
        end: "2026-10-31",
      });
    });
  });
});
