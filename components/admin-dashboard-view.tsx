"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Activity,
  FileText,
  TrendingUp,
  RefreshCw,
  Shield,
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
  HandCoins,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import type { AdminAnalytics } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const AdminSignupsChart = dynamic(
  () =>
    import("@/components/admin-activity-charts").then(
      (m) => m.AdminSignupsChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading chart...
      </div>
    ),
  },
);

const AdminActiveUsersChart = dynamic(
  () =>
    import("@/components/admin-activity-charts").then(
      (m) => m.AdminActiveUsersChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading chart...
      </div>
    ),
  },
);

export interface AdminDashboardViewProps {
  initialData: AdminAnalytics;
}

function formatFooterTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const datePart = d.toISOString().slice(0, 10);
    const dateFormatted = formatDate(datePart);
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${dateFormatted} ${hours}:${minutes}`;
  } catch {
    return formatDate(new Date().toISOString().slice(0, 10));
  }
}

export function AdminDashboardView({ initialData }: AdminDashboardViewProps) {
  const [data, setData] = React.useState<AdminAnalytics>(initialData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/stats?refresh=true");
      if (!res.ok) {
        throw new Error("Failed to refresh stats");
      }
      const updated = await res.json();
      setData(updated);
      toast.success("Analytics refreshed");
    } catch (err) {
      console.error("Refresh error", err);
      toast.error("Failed to refresh analytics");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Admin Analytics
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Shield className="size-3" />
              Private
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Platform totals and aggregate usage. Visible only to verified administrators.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="admin-refresh-btn-top"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total accounts */}
        <div
          data-testid="admin-card-total-accounts"
          className="relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Total accounts
            </span>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              {data.total_accounts.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Registered user accounts</span>
        </div>

        {/* Card 2: New sign-ups */}
        <div
          data-testid="admin-card-new-signups"
          className="relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              New sign-ups
            </span>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-money-income/16 text-money-income">
              <UserPlus className="size-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {data.new_signups_7d.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-muted-foreground">last 7d</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {data.new_signups_30d.toLocaleString()}
            </span>
            <span>in last 30 days</span>
          </div>
        </div>

        {/* Card 3: Active users */}
        <div
          data-testid="admin-card-active-users"
          className="relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Active users
            </span>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {data.active_users_7d.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-muted-foreground">last 7d</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {data.active_users_30d.toLocaleString()}
            </span>
            <span>in last 30 days</span>
          </div>
        </div>

        {/* Card 4: Average entries per active user */}
        <div
          data-testid="admin-card-avg-entries"
          className="relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Avg entries / user
            </span>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {data.avg_entries_per_active_user_30d}
              </span>
              <span className="text-xs font-medium text-muted-foreground">/ 30d</span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Per active user (30 days)</span>
        </div>
      </div>

      {/* Total Entries & Month Split Card */}
      <div
        data-testid="admin-card-entries-split"
        className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Total Entries</h3>
              <p className="text-xs text-muted-foreground">Active, non-deleted entries in system</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {data.total_entries.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">all-time</span>
          </div>
        </div>

        {/* Entries this month split */}
        <div className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Entries this month:</span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {data.entries_this_month.total.toLocaleString()} total
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-money-income/20 bg-money-income/5 p-2.5">
              <ArrowDownLeft className="size-4 text-money-income shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">Income</span>
                <span className="block text-sm font-bold text-money-income tabular-nums">
                  {data.entries_this_month.income.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-money-expense/20 bg-money-expense/5 p-2.5">
              <ArrowUpRight className="size-4 text-money-expense-text shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">Expenses</span>
                <span className="block text-sm font-bold text-money-expense-text tabular-nums">
                  {data.entries_this_month.expenses.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-money-giving/20 bg-money-giving/5 p-2.5">
              <Heart className="size-4 text-money-giving-text shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">Giving</span>
                <span className="block text-sm font-bold text-money-giving-text tabular-nums">
                  {data.entries_this_month.giving.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-money-lent/20 bg-money-lent/5 p-2.5">
              <HandCoins className="size-4 text-money-lent-text shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">Money I lent</span>
                <span className="block text-sm font-bold text-money-lent-text tabular-nums">
                  {data.entries_this_month.lent.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: New sign-ups per week */}
        <div
          data-testid="admin-chart-signups"
          className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-foreground">New sign-ups per week</h3>
            <p className="text-xs text-muted-foreground">Last 12 weeks cadence</p>
          </div>

          <div className="h-56 w-full pt-2" aria-hidden="true">
            {isMounted ? (
              <AdminSignupsChart data={data.signups_per_week} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading chart...
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Active users per week */}
        <div
          data-testid="admin-chart-active-users"
          className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-foreground">Active users per week</h3>
            <p className="text-xs text-muted-foreground">
              Users creating or updating entries (last 12 weeks)
            </p>
          </div>

          <div className="h-56 w-full pt-2" aria-hidden="true">
            {isMounted ? (
              <AdminActiveUsersChart data={data.active_users_per_week} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading chart...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span data-testid="admin-updated-timestamp">
          Updated {formatFooterTimestamp(data.generated_at)}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">Results cached for 5 minutes</span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="admin-refresh-btn-footer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("size-3", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
