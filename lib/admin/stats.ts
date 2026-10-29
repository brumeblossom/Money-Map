import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminAnalytics, WeeklyMetric } from "./types";

let cachedAnalytics: AdminAnalytics | null = null;
let lastCachedTimestamp = 0;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Resets the in-memory cache (primarily used in testing).
 */
export function clearAnalyticsCache(): void {
  cachedAnalytics = null;
  lastCachedTimestamp = 0;
}

/**
 * Fallback computation in pure TypeScript using service role client table queries
 * if the `get_admin_analytics` RPC has not been pushed to the remote DB yet.
 */
async function computeAnalyticsFallback(): Promise<AdminAnalytics> {
  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Total accounts & signups
  let totalAccounts = 0;
  let newSignups7d = 0;
  let newSignups30d = 0;
  const userCreationDates: Date[] = [];

  try {
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (!usersErr && usersData?.users) {
      totalAccounts = usersData.users.length;
      for (const u of usersData.users) {
        const d = new Date(u.created_at);
        userCreationDates.push(d);
        if (d >= sevenDaysAgo) newSignups7d++;
        if (d >= thirtyDaysAgo) newSignups30d++;
      }
    } else {
      // Fallback to profiles table
      const { data: profs } = await supabase.from("profiles").select("created_at");
      if (profs) {
        totalAccounts = profs.length;
        for (const p of profs) {
          const d = new Date(p.created_at);
          userCreationDates.push(d);
          if (d >= sevenDaysAgo) newSignups7d++;
          if (d >= thirtyDaysAgo) newSignups30d++;
        }
      }
    }
  } catch {
    // If auth API is blocked or offline, use profiles
    const { data: profs } = await supabase.from("profiles").select("created_at");
    if (profs) {
      totalAccounts = profs.length;
      for (const p of profs) {
        const d = new Date(p.created_at);
        userCreationDates.push(d);
        if (d >= sevenDaysAgo) newSignups7d++;
        if (d >= thirtyDaysAgo) newSignups30d++;
      }
    }
  }

  // 2. Fetch table activity for active users & entries
  const [entriesRes, loansRes, paymentsRes, recurRes] = await Promise.all([
    supabase
      .from("entries")
      .select("id, user_id, kind, occurred_on, created_at, updated_at, server_updated_at, deleted_at"),
    supabase
      .from("loans")
      .select("id, user_id, started_on, created_at, updated_at, server_updated_at, deleted_at"),
    supabase
      .from("loan_payments")
      .select("id, user_id, paid_on, created_at, updated_at, server_updated_at, deleted_at"),
    supabase
      .from("recurring_rules")
      .select("id, user_id, created_at, updated_at, server_updated_at, deleted_at"),
  ]);

  const entries = entriesRes.data || [];
  const loans = loansRes.data || [];
  const payments = paymentsRes.data || [];
  const recur = recurRes.data || [];

  const activeUsers7dSet = new Set<string>();
  const activeUsers30dSet = new Set<string>();

  const checkActivity = (row: {
    user_id: string;
    created_at?: string;
    updated_at?: string;
    server_updated_at?: string;
  }) => {
    const dates = [row.created_at, row.updated_at, row.server_updated_at]
      .filter(Boolean)
      .map((ts) => new Date(ts!));
    const mostRecent = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    if (mostRecent) {
      if (mostRecent >= sevenDaysAgo) activeUsers7dSet.add(row.user_id);
      if (mostRecent >= thirtyDaysAgo) activeUsers30dSet.add(row.user_id);
    }
  };

  entries.forEach(checkActivity);
  loans.forEach(checkActivity);
  payments.forEach(checkActivity);
  recur.forEach(checkActivity);

  // Total entries (not deleted)
  const activeEntries = entries.filter((e) => !e.deleted_at);
  const totalEntries = activeEntries.length;

  // Entries this month
  const currentMonthYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  let incomeMonth = 0;
  let expensesMonth = 0;
  let givingMonth = 0;

  for (const e of activeEntries) {
    const occurred = new Date(e.occurred_on);
    if (
      occurred.getUTCFullYear() === currentMonthYear &&
      occurred.getUTCMonth() === currentMonth
    ) {
      if (e.kind === "income") incomeMonth++;
      else if (e.kind === "expense") expensesMonth++;
      else if (e.kind === "giving") givingMonth++;
    }
  }

  let lentMonth = 0;
  for (const l of loans.filter((l) => !l.deleted_at)) {
    const started = new Date(l.started_on);
    if (
      started.getUTCFullYear() === currentMonthYear &&
      started.getUTCMonth() === currentMonth
    ) {
      lentMonth++;
    }
  }

  // Average entries per active user (last 30 days)
  let entries30dCount = 0;
  for (const e of activeEntries) {
    const created = new Date(e.created_at);
    if (created >= thirtyDaysAgo) {
      entries30dCount++;
    }
  }
  const active30dCount = activeUsers30dSet.size;
  const avgEntries = active30dCount > 0 ? Math.round((entries30dCount / active30dCount) * 10) / 10 : 0;

  // 12-week charts
  // Week intervals: current Monday (or week start) going back 11 weeks (12 weeks total)
  const weeklySignups: WeeklyMetric[] = [];
  const weeklyActive: WeeklyMetric[] = [];

  const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0
  const thisWeekMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek)
  );

  for (let i = 11; i >= 0; i--) {
    const wStart = new Date(thisWeekMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isoDateStr = wStart.toISOString().slice(0, 10);

    // Signups in week
    const signups = userCreationDates.filter((d) => d >= wStart && d < wEnd).length;
    weeklySignups.push({ week_start: isoDateStr, count: signups });

    // Active users in week
    const activeInWeek = new Set<string>();
    const checkWeekActivity = (row: {
      user_id: string;
      created_at?: string;
      updated_at?: string;
      server_updated_at?: string;
    }) => {
      const dates = [row.created_at, row.updated_at, row.server_updated_at]
        .filter(Boolean)
        .map((ts) => new Date(ts!));
      if (dates.some((d) => d >= wStart && d < wEnd)) {
        activeInWeek.add(row.user_id);
      }
    };
    entries.forEach(checkWeekActivity);
    loans.forEach(checkWeekActivity);
    payments.forEach(checkWeekActivity);
    recur.forEach(checkWeekActivity);

    weeklyActive.push({ week_start: isoDateStr, count: activeInWeek.size });
  }

  return {
    total_accounts: totalAccounts,
    new_signups_7d: newSignups7d,
    new_signups_30d: newSignups30d,
    active_users_7d: activeUsers7dSet.size,
    active_users_30d: active30dCount,
    total_entries: totalEntries,
    entries_this_month: {
      income: incomeMonth,
      expenses: expensesMonth,
      giving: givingMonth,
      lent: lentMonth,
      total: incomeMonth + expensesMonth + givingMonth + lentMonth,
    },
    avg_entries_per_active_user_30d: avgEntries,
    signups_per_week: weeklySignups,
    active_users_per_week: weeklyActive,
    generated_at: now.toISOString(),
  };
}

/**
 * Fetches admin analytics with 5-minute caching.
 * Attempts to execute PostgreSQL RPC `get_admin_analytics()` first.
 * Falls back to service role table queries if RPC is not deployed yet.
 */
export async function getAdminAnalytics(forceRefresh = false): Promise<AdminAnalytics> {
  const now = Date.now();
  if (!forceRefresh && cachedAnalytics && now - lastCachedTimestamp < FIVE_MINUTES_MS) {
    return cachedAnalytics;
  }

  const supabase = createAdminClient();

  try {
    // Attempt RPC execution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_admin_analytics");
    if (!error && data) {
      cachedAnalytics = data as AdminAnalytics;
      lastCachedTimestamp = Date.now();
      return cachedAnalytics;
    }
  } catch {
    // Fall back below
  }

  // Fallback if RPC is unavailable
  const fallback = await computeAnalyticsFallback();
  cachedAnalytics = fallback;
  lastCachedTimestamp = Date.now();
  return fallback;
}
