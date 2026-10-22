import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDueLoans, computeDueReminders, buildReminderEmailHtml } from "@/lib/calc/reminders";
import type { LoanRow, LoanPaymentRow, RecurringRuleRow, ProfileRow } from "@/lib/db/dexie";
import { GET } from "@/app/api/cron/reminders/route";
import { NextRequest } from "next/server";

describe("Reminders Calculation (US-4.3 & US-5.1)", () => {
  const dummyLoans: LoanRow[] = [
    {
      id: "loan-1",
      user_id: "user-1",
      counterparty: "Ada",
      principal_minor: 2750000, // ₦27,500.00
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-10-24", // 2 days after today (2026-10-22)
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "loan-paid-off",
      user_id: "user-1",
      counterparty: "Chidi",
      principal_minor: 5000000,
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-10-23", // tomorrow
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "loan-far-future",
      user_id: "user-1",
      counterparty: "Emeka",
      principal_minor: 10000000,
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-11-15", // > 3 days
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "loan-remind-off",
      user_id: "user-1",
      counterparty: "Bola",
      principal_minor: 2000000,
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-10-23",
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: false, // remind switched off
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  const dummyPayments: LoanPaymentRow[] = [
    // loan-paid-off is fully paid: 50,000.00
    {
      id: "pay-1",
      user_id: "user-1",
      loan_id: "loan-paid-off",
      amount_minor: 5000000,
      paid_on: "2026-10-15",
      note: "Full repayment",
      created_at: "2026-10-15T00:00:00Z",
      updated_at: "2026-10-15T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-15T00:00:00Z",
    },
  ];

  it("shows a loan expected back in 2 days in the Due section and formats message with DD-MM-YYYY", () => {
    const today = "2026-10-22";
    const due = getDueLoans({
      loans: dummyLoans,
      loanPayments: dummyPayments,
      todayIso: today,
      currency: "NGN",
    });

    // Only Ada's loan should be due
    expect(due).toHaveLength(1);
    expect(due[0].loanId).toBe("loan-1");
    expect(due[0].counterparty).toBe("Ada");
    expect(due[0].dueAmountMinor).toBe(2750000);
    expect(due[0].formattedExpectedDate).toBe("24-10-2026");
    expect(due[0].message).toBe("Ada is due to pay back ₦27,500.00 on 24-10-2026");
    expect(due[0].href).toBe("/lent/loan-1");
  });

  it("does not show a paid-off loan in the Due section", () => {
    const today = "2026-10-22";
    const due = getDueLoans({
      loans: dummyLoans,
      loanPayments: dummyPayments,
      todayIso: today,
    });

    const chidiLoan = due.find((d) => d.counterparty === "Chidi");
    expect(chidiLoan).toBeUndefined();
  });

  it("does not show loans expected further than 3 days in the future", () => {
    const today = "2026-10-22";
    const due = getDueLoans({
      loans: dummyLoans,
      loanPayments: dummyPayments,
      todayIso: today,
    });

    const emekaLoan = due.find((d) => d.counterparty === "Emeka");
    expect(emekaLoan).toBeUndefined();
  });

  it("does not show loans where remind is false", () => {
    const today = "2026-10-22";
    const due = getDueLoans({
      loans: dummyLoans,
      loanPayments: dummyPayments,
      todayIso: today,
    });

    const bolaLoan = due.find((d) => d.counterparty === "Bola");
    expect(bolaLoan).toBeUndefined();
  });

  it("shows overdue loans (expected date in the past)", () => {
    const overdueLoan: LoanRow = {
      id: "loan-overdue",
      user_id: "user-1",
      counterparty: "Tunde",
      principal_minor: 1500000,
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-10-20", // 2 days ago
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    };

    const due = getDueLoans({
      loans: [overdueLoan],
      loanPayments: [],
      todayIso: "2026-10-22",
    });

    expect(due).toHaveLength(1);
    expect(due[0].isOverdue).toBe(true);
    expect(due[0].formattedExpectedDate).toBe("20-10-2026");
    expect(due[0].message).toBe("Tunde is due to pay back ₦15,000.00 on 20-10-2026");
  });

  it("handles multi-instalment loans correctly", () => {
    const weeklyLoan: LoanRow = {
      id: "loan-weekly",
      user_id: "user-1",
      counterparty: "Kemi",
      principal_minor: 4000000, // 40,000 total (2 weekly instalments of 20,000)
      category_id: "cat-1",
      started_on: "2026-10-10",
      due_on: "2026-10-24", // final due
      plan: "weekly",
      instalment_minor: 2000000,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-10T00:00:00Z",
      updated_at: "2026-10-10T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-10T00:00:00Z",
    };

    // First instalment due on 2026-10-17 (overdue on 2026-10-22)
    const due = getDueLoans({
      loans: [weeklyLoan],
      loanPayments: [],
      todayIso: "2026-10-22",
    });

    expect(due).toHaveLength(1);
    expect(due[0].dueAmountMinor).toBe(2000000);
    expect(due[0].expectedDate).toBe("2026-10-17");
  });

  it("computes combined due reminders summary with loans and recurring rules", () => {
    const recurringRule: RecurringRuleRow = {
      id: "rule-rent",
      user_id: "user-1",
      kind: "expense",
      amount_minor: 15000000,
      category_id: "cat-1",
      counterparty: "Landlord",
      description: "Rent",
      frequency: "monthly",
      next_due_on: "2026-10-22", // due today
      is_paused: false,
      created_at: "2026-09-22T00:00:00Z",
      updated_at: "2026-09-22T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-09-22T00:00:00Z",
    };

    const summary = computeDueReminders({
      loans: dummyLoans,
      loanPayments: dummyPayments,
      recurringRules: [recurringRule],
      todayIso: "2026-10-22",
    });

    expect(summary.hasDueItems).toBe(true);
    expect(summary.dueLoans).toHaveLength(1);
    expect(summary.dueRecurringRules).toHaveLength(1);
  });
});

describe("User Isolation & Privacy (Two Users Test)", () => {
  const user1Profile: ProfileRow = {
    user_id: "user-alice",
    display_name: "Alice",
    currency: "NGN",
    notifications_enabled: true,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  const user2Profile: ProfileRow = {
    user_id: "user-bob",
    display_name: "Bob",
    currency: "USD",
    notifications_enabled: true,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  const allLoans: LoanRow[] = [
    {
      id: "loan-alice-1",
      user_id: "user-alice",
      counterparty: "David",
      principal_minor: 5000000,
      category_id: "cat-1",
      started_on: "2026-10-01",
      due_on: "2026-10-23",
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "loan-bob-1",
      user_id: "user-bob",
      counterparty: "Sarah",
      principal_minor: 10000, // $100.00
      category_id: "cat-2",
      started_on: "2026-10-01",
      due_on: "2026-10-23",
      plan: "one_payment",
      instalment_minor: null,
      interest_type: "none",
      interest_value: 0,
      remind: true,
      description: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  const allRules: RecurringRuleRow[] = [
    {
      id: "rule-alice-1",
      user_id: "user-alice",
      kind: "expense",
      amount_minor: 15000000,
      category_id: "cat-1",
      counterparty: null,
      description: "Alice Rent",
      frequency: "monthly",
      next_due_on: "2026-10-22",
      is_paused: false,
      created_at: "2026-09-22T00:00:00Z",
      updated_at: "2026-09-22T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-09-22T00:00:00Z",
    },
    {
      id: "rule-bob-1",
      user_id: "user-bob",
      kind: "expense",
      amount_minor: 5000,
      category_id: "cat-2",
      counterparty: null,
      description: "Bob Gym",
      frequency: "monthly",
      next_due_on: "2026-10-22",
      is_paused: false,
      created_at: "2026-09-22T00:00:00Z",
      updated_at: "2026-09-22T00:00:00Z",
      deleted_at: null,
      server_updated_at: "2026-09-22T00:00:00Z",
    },
  ];

  it("ensures User A never sees User B's reminders in calculation and email", () => {
    const today = "2026-10-22";

    // Filter for Alice strictly by user_id
    const aliceLoans = allLoans.filter((l) => l.user_id === user1Profile.user_id);
    const aliceRules = allRules.filter((r) => r.user_id === user1Profile.user_id);

    const aliceDueLoans = getDueLoans({
      loans: aliceLoans,
      loanPayments: [],
      todayIso: today,
      currency: user1Profile.currency,
    });
    const aliceDueRules = aliceRules.filter((r) => r.next_due_on <= today);

    // Filter for Bob strictly by user_id
    const bobLoans = allLoans.filter((l) => l.user_id === user2Profile.user_id);
    const bobRules = allRules.filter((r) => r.user_id === user2Profile.user_id);

    const bobDueLoans = getDueLoans({
      loans: bobLoans,
      loanPayments: [],
      todayIso: today,
      currency: user2Profile.currency,
    });
    const bobDueRules = bobRules.filter((r) => r.next_due_on <= today);

    // Alice assertions:
    expect(aliceDueLoans).toHaveLength(1);
    expect(aliceDueLoans[0].counterparty).toBe("David");
    expect(aliceDueRules[0].description).toBe("Alice Rent");

    // Alice email must NOT contain Sarah or Bob Gym
    const aliceHtml = buildReminderEmailHtml({
      userEmail: "alice@example.com",
      profile: user1Profile,
      dueLoans: aliceDueLoans,
      dueRules: aliceDueRules,
      categories: [],
      todayIso: today,
    });

    expect(aliceHtml).toContain("David is due to pay back");
    expect(aliceHtml).toContain("Alice Rent");
    expect(aliceHtml).not.toContain("Sarah");
    expect(aliceHtml).not.toContain("Bob Gym");

    // Bob assertions:
    expect(bobDueLoans).toHaveLength(1);
    expect(bobDueLoans[0].counterparty).toBe("Sarah");
    expect(bobDueRules[0].description).toBe("Bob Gym");

    // Bob email must NOT contain David or Alice Rent
    const bobHtml = buildReminderEmailHtml({
      userEmail: "bob@example.com",
      profile: user2Profile,
      dueLoans: bobDueLoans,
      dueRules: bobDueRules,
      categories: [],
      todayIso: today,
    });

    expect(bobHtml).toContain("Sarah is due to pay back");
    expect(bobHtml).toContain("Bob Gym");
    expect(bobHtml).not.toContain("David");
    expect(bobHtml).not.toContain("Alice Rent");
  });
});

describe("GET /api/cron/reminders Endpoint Protection & Configuration", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when Authorization header is missing", async () => {
    vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
    const req = new NextRequest("http://localhost:3000/api/cron/reminders");

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header does not match CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
    const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns { sent: 0, skipped: 'email not configured' } when authorized but RESEND_API_KEY is missing", async () => {
    vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
    vi.stubEnv("RESEND_API_KEY", ""); // empty
    const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
      headers: {
        authorization: "Bearer super-secret-cron-token",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ sent: 0, skipped: "email not configured" });
  });
});
