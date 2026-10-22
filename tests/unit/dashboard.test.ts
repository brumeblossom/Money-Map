import { describe, it, expect } from "vitest";
import {
  computeSpendingByCategory,
  computeCashFlowSeries,
  computeActiveLoans,
  computeDashboardData,
  getPeriodPreset,
} from "@/lib/calc";
import type { EntryRow, CategoryRow, LoanRow, LoanPaymentRow } from "@/lib/db/dexie";

describe("Dashboard Calculations & Performance", () => {
  const dummyCategories: CategoryRow[] = [
    {
      id: "cat-food",
      user_id: "user-1",
      name: "Food & Dining",
      slug: "food",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-rent",
      user_id: "user-1",
      name: "Rent",
      slug: "rent",
      scope: "expense",
      is_default: true,
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
      name: "Transport",
      slug: "transport",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-bills",
      user_id: "user-1",
      name: "Bills",
      slug: "bills",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 4,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-health",
      user_id: "user-1",
      name: "Health",
      slug: "health",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 5,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-shopping",
      user_id: "user-1",
      name: "Shopping",
      slug: "shopping",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 6,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "cat-travel",
      user_id: "user-1",
      name: "Travel",
      slug: "travel",
      scope: "expense",
      is_default: true,
      is_hidden: false,
      sort_order: 7,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      server_updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];

  it("computes spending by category: top 5 categories + Other with exact amounts and percentages", () => {
    const period = { start: "2026-10-01", end: "2026-10-31" };

    const entries: EntryRow[] = [
      {
        id: "e1",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 50_000_00, // 50,000
        occurred_on: "2026-10-05",
        counterparty: null,
        description: "Groceries",
        recurring_rule_id: null,
        created_at: "2026-10-05T10:00:00Z",
        updated_at: "2026-10-05T10:00:00Z",
        server_updated_at: "2026-10-05T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e2",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-rent",
        amount_minor: 30_000_00, // 30,000
        occurred_on: "2026-10-06",
        counterparty: null,
        description: "Rent part",
        recurring_rule_id: null,
        created_at: "2026-10-06T10:00:00Z",
        updated_at: "2026-10-06T10:00:00Z",
        server_updated_at: "2026-10-06T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e3",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-transport",
        amount_minor: 10_000_00, // 10,000
        occurred_on: "2026-10-07",
        counterparty: null,
        description: "Fuel",
        recurring_rule_id: null,
        created_at: "2026-10-07T10:00:00Z",
        updated_at: "2026-10-07T10:00:00Z",
        server_updated_at: "2026-10-07T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e4",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-bills",
        amount_minor: 5_000_00, // 5,000
        occurred_on: "2026-10-08",
        counterparty: null,
        description: "Internet",
        recurring_rule_id: null,
        created_at: "2026-10-08T10:00:00Z",
        updated_at: "2026-10-08T10:00:00Z",
        server_updated_at: "2026-10-08T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e5",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-health",
        amount_minor: 3_000_00, // 3,000
        occurred_on: "2026-10-09",
        counterparty: null,
        description: "Meds",
        recurring_rule_id: null,
        created_at: "2026-10-09T10:00:00Z",
        updated_at: "2026-10-09T10:00:00Z",
        server_updated_at: "2026-10-09T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e6",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-shopping",
        amount_minor: 1_500_00, // 1,500
        occurred_on: "2026-10-10",
        counterparty: null,
        description: "Shirt",
        recurring_rule_id: null,
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
        server_updated_at: "2026-10-10T10:00:00Z",
        deleted_at: null,
      },
      {
        id: "e7",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-travel",
        amount_minor: 500_00, // 500
        occurred_on: "2026-10-11",
        counterparty: null,
        description: "Bus ticket",
        recurring_rule_id: null,
        created_at: "2026-10-11T10:00:00Z",
        updated_at: "2026-10-11T10:00:00Z",
        server_updated_at: "2026-10-11T10:00:00Z",
        deleted_at: null,
      },
    ];

    const result = computeSpendingByCategory(entries, dummyCategories, period);

    // Total expense: 50k + 30k + 10k + 5k + 3k + 1.5k + 0.5k = 100k (10,000,000 minor)
    expect(result.total_minor).toBe(10_000_000);
    // Should have top 5 + Other = 6 items
    expect(result.items.length).toBe(6);
    expect(result.items[0]).toMatchObject({
      id: "cat-food",
      name: "Food & Dining",
      amount_minor: 5_000_000,
      percent: 50,
    });
    expect(result.items[1]).toMatchObject({
      id: "cat-rent",
      name: "Rent",
      amount_minor: 3_000_000,
      percent: 30,
    });
    expect(result.items[2]).toMatchObject({
      id: "cat-transport",
      name: "Transport",
      amount_minor: 1_000_000,
      percent: 10,
    });
    expect(result.items[3]).toMatchObject({
      id: "cat-bills",
      name: "Bills",
      amount_minor: 500_000,
      percent: 5,
    });
    expect(result.items[4]).toMatchObject({
      id: "cat-health",
      name: "Health",
      amount_minor: 300_000,
      percent: 3,
    });
    // Other bundles shopping (1,500) + travel (500) = 2,000 (200,000 minor) = 2%
    expect(result.items[5]).toMatchObject({
      id: "other",
      name: "Other",
      amount_minor: 200_000,
      percent: 2,
    });
  });

  it("handles empty spending by category gracefully", () => {
    const period = { start: "2026-10-01", end: "2026-10-31" };
    const result = computeSpendingByCategory([], dummyCategories, period);
    expect(result.items).toEqual([]);
    expect(result.total_minor).toBe(0);
  });

  it("computes short period cash flow series (daily DD-MM)", () => {
    const period = { start: "2026-10-19", end: "2026-10-25" }; // 7 days (this week)
    const entries: EntryRow[] = [
      {
        id: "e1",
        user_id: "u1",
        kind: "income",
        category_id: "cat-salary",
        amount_minor: 100_000_00,
        occurred_on: "2026-10-20",
        counterparty: "Employer",
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-20T08:00:00Z",
        updated_at: "2026-10-20T08:00:00Z",
        server_updated_at: "2026-10-20T08:00:00Z",
        deleted_at: null,
      },
      {
        id: "e2",
        user_id: "u1",
        kind: "expense",
        category_id: "cat-food",
        amount_minor: 15_000_00,
        occurred_on: "2026-10-20",
        counterparty: null,
        description: null,
        recurring_rule_id: null,
        created_at: "2026-10-20T12:00:00Z",
        updated_at: "2026-10-20T12:00:00Z",
        server_updated_at: "2026-10-20T12:00:00Z",
        deleted_at: null,
      },
    ];

    const series = computeCashFlowSeries(entries, period, "2026-10-22");
    expect(series.length).toBe(7);
    const day20 = series.find((p) => p.key === "2026-10-20");
    expect(day20).toBeDefined();
    expect(day20?.label).toBe("20-10");
    expect(day20?.income_minor).toBe(100_000_00);
    expect(day20?.expenses_minor).toBe(15_000_00);
    expect(day20?.income).toBe(100_000);
    expect(day20?.expenses).toBe(15_000);
  });

  it("computes active loans metrics with countdown and progress", () => {
    const loans: LoanRow[] = [
      {
        id: "loan-1",
        user_id: "u1",
        counterparty: "Chinedu",
        principal_minor: 50_000_00, // 50,000
        interest_type: "none",
        interest_value: 0,
        started_on: "2026-10-01",
        due_on: "2026-10-31",
        plan: "monthly",
        instalment_minor: 50_000_00,
        category_id: "cat-lent",
        remind: true,
        description: "Small loan",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        server_updated_at: "2026-10-01T00:00:00Z",
        deleted_at: null,
      },
    ];

    const payments: LoanPaymentRow[] = [
      {
        id: "pay-1",
        user_id: "u1",
        loan_id: "loan-1",
        amount_minor: 20_000_00, // 20,000 paid
        paid_on: "2026-10-15",
        note: "Partial",
        created_at: "2026-10-15T00:00:00Z",
        updated_at: "2026-10-15T00:00:00Z",
        server_updated_at: "2026-10-15T00:00:00Z",
        deleted_at: null,
      },
    ];

    const active = computeActiveLoans(loans, payments, "2026-10-22");
    expect(active.length).toBe(1);
    expect(active[0].loan.counterparty).toBe("Chinedu");
    expect(active[0].total).toBe(50_000_00);
    expect(active[0].received).toBe(20_000_00);
    expect(active[0].balance).toBe(30_000_00);
    expect(active[0].progressPercent).toBe(40);
    expect(active[0].status).toBe("Active");
  });

  it("benchmarks 5,000 entries calculation performance under 300 ms", () => {
    // Generate 5,000 synthetic entries spanning across 6 months
    const syntheticEntries: EntryRow[] = [];
    const kinds: Array<"income" | "expense" | "giving"> = ["income", "expense", "expense", "expense", "giving"];
    const categoryIds = dummyCategories.map((c) => c.id);

    const baseDate = new Date(Date.UTC(2026, 4, 1)); // May 1, 2026
    for (let i = 0; i < 5000; i++) {
      const dayOffset = i % 180; // 180 days ~ 6 months
      const d = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() + dayOffset));
      const year = d.getUTCFullYear();
      const monthStr = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getUTCDate()).padStart(2, "0");
      const isoDate = `${year}-${monthStr}-${dayStr}`;

      syntheticEntries.push({
        id: `entry-${i}`,
        user_id: "user-benchmark",
        kind: kinds[i % kinds.length],
        category_id: categoryIds[i % categoryIds.length],
        amount_minor: 1000_00 + (i % 50_000_00),
        occurred_on: isoDate,
        counterparty: `Counterparty ${i % 20}`,
        description: `Entry description ${i}`,
        recurring_rule_id: null,
        created_at: `${isoDate}T12:00:00Z`,
        updated_at: `${isoDate}T12:00:00Z`,
        server_updated_at: `${isoDate}T12:00:00Z`,
        deleted_at: null,
      });
    }

    const period = getPeriodPreset("thisMonth", "2026-10-22");

    const startTime = performance.now();

    const data = computeDashboardData({
      entries: syntheticEntries,
      categories: dummyCategories,
      loans: [],
      loanPayments: [],
      period,
      today: "2026-10-22",
      currency: "NGN",
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[PERF BENCHMARK] Dashboard calculations for 5,000 entries took ${duration.toFixed(2)} ms`);

    expect(duration).toBeLessThan(600);
    expect(data.totals).toBeDefined();
    expect(data.spendingByCategory.items.length).toBeGreaterThan(0);
    expect(data.cashFlowSeries.length).toBe(6);
    expect(data.recentEntries.length).toBe(5);
  });
});
