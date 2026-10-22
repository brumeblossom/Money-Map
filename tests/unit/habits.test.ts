import { describe, it, expect } from "vitest";
import {
  getCategoryHabit,
  computeHabitsOverview,
  computeCategoryDetailReport,
} from "@/lib/calc/habits";
import type { EntryRow, CategoryRow } from "@/lib/db/dexie";

describe("Habits Calculations (PRD US-7.1 and Section 5.3)", () => {
  const categories: CategoryRow[] = [
    {
      id: "cat-food",
      user_id: "user-1",
      scope: "expense",
      name: "Food",
      slug: "food",
      is_default: true,
      is_hidden: false,
      sort_order: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-electronics",
      user_id: "user-1",
      scope: "expense",
      name: "Electronics",
      slug: "electronics",
      is_default: false,
      is_hidden: false,
      sort_order: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-transport",
      user_id: "user-1",
      scope: "expense",
      name: "Transport",
      slug: "transport",
      is_default: true,
      is_hidden: false,
      sort_order: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];

  it("identifies 'Rising' when Food rises 20% two months in a row", () => {
    // Current month is 2026-10 (M0).
    // M1 = 2026-09, M2 = 2026-08, M3 = 2026-07.
    // M2 = 100,000, M1 = 120,000 (+20%), M0 = 144,000 (+20%)
    const entries: EntryRow[] = [
      {
        id: "e-1",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 100_000_00,
        occurred_on: "2026-08-15",
        counterparty: null,
        description: "August food",
        recurring_rule_id: null,
        created_at: "2026-08-15T00:00:00Z",
        updated_at: "2026-08-15T00:00:00Z",
        server_updated_at: "2026-08-15T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-2",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 120_000_00,
        occurred_on: "2026-09-15",
        counterparty: null,
        description: "Sept food",
        recurring_rule_id: null,
        created_at: "2026-09-15T00:00:00Z",
        updated_at: "2026-09-15T00:00:00Z",
        server_updated_at: "2026-09-15T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-3",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 144_000_00,
        occurred_on: "2026-10-15",
        counterparty: null,
        description: "Oct food",
        recurring_rule_id: null,
        created_at: "2026-10-15T00:00:00Z",
        updated_at: "2026-10-15T00:00:00Z",
        server_updated_at: "2026-10-15T00:00:00Z",
        deleted_at: null,
      },
      // 4th entry in M3 to ensure average A > 0 and not a Spike
      {
        id: "e-4",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 100_000_00,
        occurred_on: "2026-07-20",
        counterparty: null,
        description: "July food",
        recurring_rule_id: null,
        created_at: "2026-07-20T00:00:00Z",
        updated_at: "2026-07-20T00:00:00Z",
        server_updated_at: "2026-07-20T00:00:00Z",
        deleted_at: null,
      },
    ];

    const habit = getCategoryHabit("cat-food", entries, "2026-10");
    expect(habit.label).toBe("Rising");
    expect(habit.explanation).toBe("Up more than 15% two months in a row");
  });

  it("identifies 'Spike' for a one-off big month", () => {
    // Current month 2026-10 (M0).
    // M1 = 2026-09 (₦50,000), M2 = 2026-08 (₦50,000), M3 = 2026-07 (₦50,000).
    // Average A = ₦50,000.
    // M0 = ₦250,000 (>= 2 * A).
    const entries: EntryRow[] = [
      {
        id: "e-sp-1",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-electronics",
        amount_minor: 50_000_00,
        occurred_on: "2026-07-10",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-07-10T00:00:00Z",
        updated_at: "2026-07-10T00:00:00Z",
        server_updated_at: "2026-07-10T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-sp-2",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-electronics",
        amount_minor: 50_000_00,
        occurred_on: "2026-08-10",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-08-10T00:00:00Z",
        updated_at: "2026-08-10T00:00:00Z",
        server_updated_at: "2026-08-10T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-sp-3",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-electronics",
        amount_minor: 50_000_00,
        occurred_on: "2026-09-10",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-09-10T00:00:00Z",
        updated_at: "2026-09-10T00:00:00Z",
        server_updated_at: "2026-09-10T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-sp-4",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-electronics",
        amount_minor: 250_000_00,
        occurred_on: "2026-10-12",
        counterparty: null,
        description: "New laptop",
        recurring_rule_id: null,
        created_at: "2026-10-12T00:00:00Z",
        updated_at: "2026-10-12T00:00:00Z",
        server_updated_at: "2026-10-12T00:00:00Z",
        deleted_at: null,
      },
    ];

    const habit = getCategoryHabit("cat-electronics", entries, "2026-10");
    expect(habit.label).toBe("Spike");
    expect(habit.explanation).toBe("More than double the 3-month average");
  });

  it("identifies 'Not enough data yet' for a category with only 2 entries", () => {
    const entries: EntryRow[] = [
      {
        id: "e-low-1",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-transport",
        amount_minor: 15_000_00,
        occurred_on: "2026-10-02",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-02T00:00:00Z",
        updated_at: "2026-10-02T00:00:00Z",
        server_updated_at: "2026-10-02T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-low-2",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-transport",
        amount_minor: 12_000_00,
        occurred_on: "2026-10-05",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-05T00:00:00Z",
        updated_at: "2026-10-05T00:00:00Z",
        server_updated_at: "2026-10-05T00:00:00Z",
        deleted_at: null,
      },
    ];

    const habit = getCategoryHabit("cat-transport", entries, "2026-10");
    expect(habit.label).toBe("Not enough data yet");
    expect(habit.explanation).toBe("Fewer than 3 entries in the last 4 months");
  });

  it("computes habits overview ranking categories by spend in period", () => {
    const period = { start: "2026-10-01", end: "2026-10-31" };
    const entries: EntryRow[] = [
      // Electronics: ₦250,000
      {
        id: "e-1",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-electronics",
        amount_minor: 250_000_00,
        occurred_on: "2026-10-10",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-10T00:00:00Z",
        updated_at: "2026-10-10T00:00:00Z",
        server_updated_at: "2026-10-10T00:00:00Z",
        deleted_at: null,
      },
      // Food: ₦100,000
      {
        id: "e-2",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 100_000_00,
        occurred_on: "2026-10-12",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-12T00:00:00Z",
        updated_at: "2026-10-12T00:00:00Z",
        server_updated_at: "2026-10-12T00:00:00Z",
        deleted_at: null,
      },
      // Transport: ₦50,000
      {
        id: "e-3",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-transport",
        amount_minor: 50_000_00,
        occurred_on: "2026-10-15",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-15T00:00:00Z",
        updated_at: "2026-10-15T00:00:00Z",
        server_updated_at: "2026-10-15T00:00:00Z",
        deleted_at: null,
      },
    ];

    const result = computeHabitsOverview({
      categories,
      entries,
      period,
      currentMonthIso: "2026-10",
      currency: "NGN",
    });

    expect(result.totalPeriodExpenses).toBe(400_000_00);
    expect(result.categories.length).toBe(3);
    // Ranked highest spend first: Electronics (250k) -> Food (100k) -> Transport (50k)
    expect(result.categories[0].categoryName).toBe("Electronics");
    expect(result.categories[0].total_minor).toBe(250_000_00);
    expect(result.categories[0].share).toBe(63); // 250/400 = 62.5% -> 63%

    expect(result.categories[1].categoryName).toBe("Food");
    expect(result.categories[1].total_minor).toBe(100_000_00);
    expect(result.categories[1].share).toBe(25); // 100/400 = 25%

    expect(result.categories[2].categoryName).toBe("Transport");
    expect(result.categories[2].total_minor).toBe(50_000_00);
    expect(result.categories[2].share).toBe(13); // 50/400 = 12.5% -> 13%

    // Sparkline trend has 6 months
    expect(result.categories[0].sparklineTrend.length).toBe(6);
  });

  it("computes category detail report with count, average, busiest weekday and biggest entry", () => {
    const period = { start: "2026-10-01", end: "2026-10-31" };
    // 2026-10-16 is Friday, 2026-10-23 is Friday
    const entries: EntryRow[] = [
      {
        id: "e-detail-1",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 20_000_00,
        occurred_on: "2026-10-16", // Friday
        counterparty: "Supermarket",
        description: "Weekly groceries",
        recurring_rule_id: null,
        created_at: "2026-10-16T00:00:00Z",
        updated_at: "2026-10-16T00:00:00Z",
        server_updated_at: "2026-10-16T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-detail-2",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 50_000_00, // Biggest
        occurred_on: "2026-10-23", // Friday
        counterparty: "Costco",
        description: "Bulk pantry restock",
        recurring_rule_id: null,
        created_at: "2026-10-23T00:00:00Z",
        updated_at: "2026-10-23T00:00:00Z",
        server_updated_at: "2026-10-23T00:00:00Z",
        deleted_at: null,
      },
      {
        id: "e-detail-3",
        user_id: "user-1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 10_000_00,
        occurred_on: "2026-10-27", // Tuesday
        counterparty: "Bakery",
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-27T00:00:00Z",
        updated_at: "2026-10-27T00:00:00Z",
        server_updated_at: "2026-10-27T00:00:00Z",
        deleted_at: null,
      },
    ];

    const report = computeCategoryDetailReport({
      categoryId: "cat-food",
      categories,
      entries,
      period,
      currentMonthIso: "2026-10",
    });

    expect(report).not.toBeNull();
    if (!report) return;

    expect(report.categoryName).toBe("Food");
    expect(report.total_minor).toBe(80_000_00);
    expect(report.count).toBe(3);
    // Average: 80,000 / 3 = 26,666.666 -> 26667
    expect(report.average_minor).toBe(2666667);
    expect(report.busiestWeekday).toBe("Friday");
    expect(report.biggestEntry?.id).toBe("e-detail-2");
    expect(report.biggestEntry?.amount_minor).toBe(50_000_00);
    expect(report.sixMonthTrend.length).toBe(6);
    expect(report.sixMonthTrend[5].label).toBe("Oct");
  });
});
