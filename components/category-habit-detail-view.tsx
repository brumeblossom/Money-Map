"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CreditCard,
  Hash,
  Calculator,
  CalendarDays,
} from "lucide-react";
import { db } from "@/lib/db/dexie";
import { useEntries, useCategories } from "@/lib/repo/hooks";
import {
  type PeriodPreset,
  getPeriodPreset,
  computeCategoryDetailReport,
} from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { DateField } from "@/components/date-field";
import { HabitBadge } from "@/components/habits-view";
import { cn } from "@/lib/utils";

const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "thisWeek", label: "This week" },
  { id: "thisMonth", label: "This month" },
  { id: "last3Months", label: "3 months" },
  { id: "thisYear", label: "Year" },
  { id: "custom", label: "Custom" },
];

function parsePeriodParam(raw: string | null): PeriodPreset {
  if (!raw) return "thisMonth";
  if (raw === "thisWeek") return "thisWeek";
  if (raw === "thisMonth") return "thisMonth";
  if (raw === "3m" || raw === "last3Months") return "last3Months";
  if (raw === "year" || raw === "thisYear") return "thisYear";
  if (raw === "custom") return "custom";
  return "thisMonth";
}

export function CategoryHabitDetailView({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const periodParam = searchParams.get("period");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [internalPreset, setInternalPreset] = React.useState<PeriodPreset | null>(null);
  const [prevPeriodParam, setPrevPeriodParam] = React.useState(periodParam);

  if (periodParam !== prevPeriodParam) {
    setPrevPeriodParam(periodParam);
    setInternalPreset(null);
  }

  const selectedPreset = internalPreset ?? parsePeriodParam(periodParam);

  const today = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const currentMonthIso = React.useMemo(() => today.slice(0, 7), [today]);

  const defaultPresetPeriod = React.useMemo(() => {
    return getPeriodPreset("thisMonth", today);
  }, [today]);

  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>(() => ({
    start: fromParam || defaultPresetPeriod.start,
    end: toParam || defaultPresetPeriod.end,
  }));

  const activePeriod = React.useMemo(() => {
    if (selectedPreset === "custom") {
      return customRange;
    }
    return getPeriodPreset(selectedPreset, today);
  }, [selectedPreset, customRange, today]);

  const handlePresetSelect = (preset: PeriodPreset) => {
    setInternalPreset(preset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    if (preset !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/insights/habits/${categoryId}?${params.toString()}`);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomRange({ start, end });
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", start);
    params.set("to", end);
    router.push(`/insights/habits/${categoryId}?${params.toString()}`);
  };

  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const currency = profile?.currency ?? "NGN";

  const rawEntries = useEntries();
  const rawCategories = useCategories();

  const entries = React.useMemo(() => rawEntries ?? [], [rawEntries]);
  const categories = React.useMemo(() => rawCategories ?? [], [rawCategories]);

  const report = React.useMemo(() => {
    return computeCategoryDetailReport({
      categoryId,
      categories,
      entries,
      period: activePeriod,
      currentMonthIso,
    });
  }, [categoryId, categories, entries, activePeriod, currentMonthIso]);

  // Fallback if category not found in DB
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-semibold text-foreground">Category not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This category may have been deleted or does not exist.
        </p>
        <Link
          href="/insights/habits"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs"
        >
          <ArrowLeft className="size-4" />
          Back to Habits
        </Link>
      </div>
    );
  }

  const trendSrSummary = report.sixMonthTrend
    .map((pt) => `${pt.label}: ${formatMoney(pt.amount_minor, currency)}`)
    .join(", ");

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Back Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/insights/habits"
            data-testid="category-report-back-button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to Habits"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-primary" />
              <h2
                data-testid="category-report-title"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {report.categoryName}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Expense category habit report
            </p>
          </div>
        </div>

        {/* Habit Label Badge and Explanation (PRD US-7.1 / Section 5.3) */}
        <div
          data-testid="category-habit-status-banner"
          className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-3.5 shadow-xs sm:p-4"
        >
          <HabitBadge label={report.habit.label} />
          <span
            data-testid="category-habit-explanation"
            className="text-xs font-medium text-muted-foreground sm:text-sm"
          >
            {report.habit.explanation}
          </span>
        </div>

        {/* Period Switcher */}
        <div className="flex flex-col gap-3">
          <div
            role="tablist"
            aria-label="Period switcher"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-1 sm:gap-2"
          >
            {PERIOD_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handlePresetSelect(preset.id)}
                  data-testid={`period-chip-${preset.id}`}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
                    isSelected
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {selectedPreset === "custom" && (
            <div
              data-testid="custom-date-inputs"
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">From</span>
                <DateField
                  value={customRange.start}
                  onChange={(val) => handleCustomDateChange(val, customRange.end)}
                  className="w-36"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">To</span>
                <DateField
                  value={customRange.end}
                  onChange={(val) => handleCustomDateChange(customRange.start, val)}
                  className="w-36"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. Total and Share Card */}
      <div
        data-testid="category-total-share-card"
        className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total & Share
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(activePeriod.start)} to {formatDate(activePeriod.end)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <div
              data-testid="category-total-amount"
              className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-4xl"
            >
              {formatMoney(report.total_minor, currency)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Spent on {report.categoryName} in this period
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="category-share-percent"
              className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary tabular-nums"
            >
              {report.share}% of expenses
            </span>
          </div>
        </div>
      </div>

      {/* 2. 6-Month Trend Line Chart */}
      <div
        data-testid="category-trend-chart-card"
        className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="border-b border-border/40 pb-3">
          <h3 className="text-base font-bold text-foreground">
            6-month trend
          </h3>
          <p className="text-xs text-muted-foreground">
            Monthly spend trajectory over the last 6 calendar months
          </p>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only" aria-live="polite">
          6-month spending trend for {report.categoryName}: {trendSrSummary}.
        </div>

        <div className="mt-4 h-56 w-full pt-2" aria-hidden="true">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={report.sixMonthTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(val) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return `${val}`;
                  }}
                />
                <RechartsTooltip
                  formatter={(val: unknown) => [
                    formatMoney(Math.round(Number(val) * 100), currency),
                    "Spent",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.8125rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount_major"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading chart...
            </div>
          )}
        </div>
      </div>

      {/* 3. Three Metrics Grid: Count, Average per Entry, Busiest Weekday */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Count */}
        <div
          data-testid="category-metric-count"
          className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Hash className="size-4" />
            <span>Count</span>
          </div>
          <div className="mt-3">
            <span
              data-testid="category-metric-count-value"
              className="text-2xl font-bold tracking-tight text-foreground tabular-nums"
            >
              {report.count}
            </span>
            <p className="text-xs text-muted-foreground">
              {" "}{report.count === 1 ? "entry recorded" : "entries recorded"}
            </p>
          </div>
        </div>

        {/* Average per entry */}
        <div
          data-testid="category-metric-average"
          className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calculator className="size-4" />
            <span>Average per entry</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatMoney(report.average_minor, currency)}
            </span>
            <p className="text-xs text-muted-foreground">per transaction</p>
          </div>
        </div>

        {/* Busiest weekday */}
        <div
          data-testid="category-metric-weekday"
          className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>Busiest weekday</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {report.busiestWeekday ?? "None"}
            </span>
            <p className="text-xs text-muted-foreground">highest spend day</p>
          </div>
        </div>
      </div>

      {/* 4. Biggest Entry Card (tappable to its record) */}
      <div
        data-testid="category-biggest-entry-card"
        className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="border-b border-border/40 pb-3">
          <h3 className="text-base font-bold text-foreground">
            Biggest entry
          </h3>
          <p className="text-xs text-muted-foreground">
            Single largest expense transaction in this period
          </p>
        </div>

        {report.biggestEntry ? (
          <Link
            href={`/records/${report.biggestEntry.id}`}
            data-testid="biggest-entry-link"
            className="group mt-4 flex items-center justify-between rounded-xl border border-border/40 p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {report.biggestEntry.counterparty ||
                    report.biggestEntry.description ||
                    report.categoryName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(report.biggestEntry.occurred_on)}
                  {report.biggestEntry.description && report.biggestEntry.counterparty
                    ? ` · ${report.biggestEntry.description}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                {formatMoney(report.biggestEntry.amount_minor, currency)}
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground sm:text-sm">
            No expense entries recorded in this period.
          </div>
        )}
      </div>
    </div>
  );
}
