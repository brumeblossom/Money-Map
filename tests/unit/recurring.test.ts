import { describe, it, expect } from "vitest";
import {
  computeNextDueDate,
  getDueRecurringRules,
  getRecurringBannerMessage,
} from "@/lib/calc/recurring";
import type { RecurringRuleRow } from "@/lib/db/dexie";

describe("Recurring Rules Date Maths (US-5.1)", () => {
  describe("Weekly frequency", () => {
    it("advances standard date by exactly 7 days", () => {
      expect(computeNextDueDate("2026-10-15", "weekly")).toBe("2026-10-22");
    });

    it("handles transition across month boundaries", () => {
      // Jan 28 + 7 days -> Feb 04
      expect(computeNextDueDate("2026-01-28", "weekly")).toBe("2026-02-04");
    });

    it("handles transition across year boundaries", () => {
      // Dec 28 + 7 days -> Jan 04 next year
      expect(computeNextDueDate("2026-12-28", "weekly")).toBe("2027-01-04");
    });

    it("handles leap year February (29 days)", () => {
      // 2028 is a leap year; Feb 25 + 7 days -> Mar 03
      expect(computeNextDueDate("2028-02-25", "weekly")).toBe("2028-03-03");
    });

    it("handles non-leap year February (28 days)", () => {
      // 2026 is common year; Feb 25 + 7 days -> Mar 04
      expect(computeNextDueDate("2026-02-25", "weekly")).toBe("2026-03-04");
    });

    it("accepts capitalized 'Weekly'", () => {
      expect(computeNextDueDate("2026-10-15", "Weekly")).toBe("2026-10-22");
    });
  });

  describe("Monthly frequency (end-of-month and leap years safe)", () => {
    it("safe on 31st of January in a common year (clamped to Feb 28)", () => {
      // 31-01 -> 28-02 in 2026
      expect(computeNextDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    });

    it("safe on 31st of January in a leap year (clamped to Feb 29)", () => {
      // 31-01 -> 29-02 in 2028 (leap year)
      expect(computeNextDueDate("2028-01-31", "monthly")).toBe("2028-02-29");
    });

    it("safe on 30th of January in a common year (clamped to Feb 28)", () => {
      expect(computeNextDueDate("2026-01-30", "monthly")).toBe("2026-02-28");
    });

    it("safe on 30th of January in a leap year (clamped to Feb 29)", () => {
      expect(computeNextDueDate("2028-01-30", "monthly")).toBe("2028-02-29");
    });

    it("safe on 31st of March (clamped to April 30)", () => {
      expect(computeNextDueDate("2026-03-31", "monthly")).toBe("2026-04-30");
    });

    it("safe on 31st of May (clamped to June 30)", () => {
      expect(computeNextDueDate("2026-05-31", "monthly")).toBe("2026-06-30");
    });

    it("safe on 31st of August (clamped to September 30)", () => {
      expect(computeNextDueDate("2026-08-31", "monthly")).toBe("2026-09-30");
    });

    it("safe on 31st of October (clamped to November 30)", () => {
      expect(computeNextDueDate("2026-10-31", "monthly")).toBe("2026-11-30");
    });

    it("safe on 31st of December (rolls to next year Jan 31)", () => {
      expect(computeNextDueDate("2026-12-31", "monthly")).toBe("2027-01-31");
    });

    it("safe on leap day February 29 (advances to March 29)", () => {
      expect(computeNextDueDate("2028-02-29", "monthly")).toBe("2028-03-29");
    });

    it("preserves standard mid-month day", () => {
      expect(computeNextDueDate("2026-04-15", "monthly")).toBe("2026-05-15");
      expect(computeNextDueDate("2026-11-01", "monthly")).toBe("2026-12-01");
    });

    it("accepts capitalized 'Monthly'", () => {
      expect(computeNextDueDate("2026-01-31", "Monthly")).toBe("2026-02-28");
    });
  });
});

describe("getDueRecurringRules", () => {
  const baseRule: RecurringRuleRow = {
    id: "r1",
    user_id: "u1",
    kind: "expense",
    frequency: "monthly",
    amount_minor: 15000000,
    category_id: "c1",
    counterparty: null,
    description: "Rent",
    next_due_on: "2026-10-22",
    is_paused: false,
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    deleted_at: null,
    server_updated_at: "2026-09-22T00:00:00Z",
  };

  it("includes rule due today", () => {
    const rules = [baseRule];
    const due = getDueRecurringRules(rules, "2026-10-22");
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe("r1");
  });

  it("includes rule overdue in the past", () => {
    const overdueRule = { ...baseRule, id: "r2", next_due_on: "2026-10-15" };
    const due = getDueRecurringRules([overdueRule], "2026-10-22");
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe("r2");
  });

  it("excludes future rules", () => {
    const futureRule = { ...baseRule, id: "r3", next_due_on: "2026-10-25" };
    const due = getDueRecurringRules([futureRule], "2026-10-22");
    expect(due).toHaveLength(0);
  });

  it("excludes paused rules even when due", () => {
    const pausedRule = { ...baseRule, id: "r4", is_paused: true };
    const due = getDueRecurringRules([pausedRule], "2026-10-22");
    expect(due).toHaveLength(0);
  });

  it("excludes soft-deleted rules", () => {
    const deletedRule = { ...baseRule, id: "r5", deleted_at: "2026-10-20T00:00:00Z" };
    const due = getDueRecurringRules([deletedRule], "2026-10-22");
    expect(due).toHaveLength(0);
  });

  it("sorts multiple due rules by oldest due first", () => {
    const rule1 = { ...baseRule, id: "r1", next_due_on: "2026-10-22" };
    const rule2 = { ...baseRule, id: "r2", next_due_on: "2026-10-10" };
    const rule3 = { ...baseRule, id: "r3", next_due_on: "2026-10-18" };
    const due = getDueRecurringRules([rule1, rule2, rule3], "2026-10-22");
    expect(due.map((r) => r.id)).toEqual(["r2", "r3", "r1"]);
  });
});

describe("getRecurringBannerMessage", () => {
  const rule: RecurringRuleRow = {
    id: "r1",
    user_id: "u1",
    kind: "expense",
    frequency: "monthly",
    amount_minor: 15000000,
    category_id: "c1",
    counterparty: null,
    description: "Rent",
    next_due_on: "2026-10-22",
    is_paused: false,
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    deleted_at: null,
    server_updated_at: "2026-09-22T00:00:00Z",
  };

  it("formats message when due today", () => {
    const { message, isPastDue, displayName } = getRecurringBannerMessage(
      rule,
      "Housing",
      "NGN",
      "2026-10-22",
    );
    expect(isPastDue).toBe(false);
    expect(displayName).toBe("Rent");
    expect(message).toBe("Rent ₦150,000.00 is due today. Add it?");
  });

  it("formats message when overdue with DD-MM-YYYY date", () => {
    const overdueRule = { ...rule, next_due_on: "2026-10-15" };
    const { message, isPastDue } = getRecurringBannerMessage(
      overdueRule,
      "Housing",
      "NGN",
      "2026-10-22",
    );
    expect(isPastDue).toBe(true);
    expect(message).toBe("Rent ₦150,000.00 was due on 15-10-2026. Add it?");
  });

  it("falls back to category name if description and counterparty are absent", () => {
    const unnamedRule = { ...rule, description: null, counterparty: null };
    const { message } = getRecurringBannerMessage(unnamedRule, "Housing", "NGN", "2026-10-22");
    expect(message).toBe("Housing ₦150,000.00 is due today. Add it?");
  });
});
