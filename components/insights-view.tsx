"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Plus,
  ArrowRight,
  Calendar,
  FileDown,
} from "lucide-react";
import { db, type CategoryRow } from "@/lib/db/dexie";
import { useEntries, useCategories, useLoans, useLoanPayments } from "@/lib/repo/hooks";
import {
  type PeriodPreset,
  getPeriodPreset,
  computeDashboardData,
  diffInDays,
} from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";
import { EntryModal } from "@/components/entry-modal";
import { ExportModal } from "@/components/export-modal";
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

const emptySubscribe = () => () => {};

export function InsightsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodParam = searchParams?.get("period") ?? null;
  const startParam = searchParams?.get("start") ?? null;
  const endParam = searchParams?.get("end") ?? null;

  // React 19 SSR-safe client mount detection (zero useEffect)
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Today reference
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Derived period preset state (avoids setState in effect)
  const [internalPreset, setInternalPreset] = React.useState<PeriodPreset | null>(null);
  const [prevPeriodParam, setPrevPeriodParam] = React.useState(periodParam);

  if (periodParam !== prevPeriodParam) {
    setPrevPeriodParam(periodParam);
    setInternalPreset(null);
  }

  const selectedPreset = internalPreset ?? parsePeriodParam(periodParam);

  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>(() => ({
    start: startParam || today.slice(0, 8) + "01",
    end: endParam || today,
  }));

  const activePeriod = React.useMemo(() => {
    return getPeriodPreset(selectedPreset, today, customRange);
  }, [selectedPreset, today, customRange]);

  // Handle period change
  const handlePresetSelect = (preset: PeriodPreset) => {
    setInternalPreset(preset);
    const params = new URLSearchParams();
    if (preset !== "thisMonth") {
      params.set("period", preset);
    }
    if (preset === "custom") {
      params.set("start", customRange.start);
      params.set("end", customRange.end);
    }
    const query = params.toString();
    router.replace(query ? `/insights?${query}` : "/insights");
  };

  const handleCustomDateChange = (type: "start" | "end", dateVal: string) => {
    const updated = { ...customRange, [type]: dateVal };
    setCustomRange(updated);
    const params = new URLSearchParams();
    params.set("period", "custom");
    params.set("start", updated.start);
    params.set("end", updated.end);
    router.replace(`/insights?${params.toString()}`);
  };

  // Live queries
  const rawEntries = useEntries();
  const rawCategories = useCategories();
  const rawLoans = useLoans();
  const rawPayments = useLoanPayments();

  const entries = React.useMemo(() => rawEntries ?? [], [rawEntries]);
  const categories = React.useMemo(() => rawCategories ?? [], [rawCategories]);
  const loans = React.useMemo(() => rawLoans ?? [], [rawLoans]);
  const loanPayments = React.useMemo(() => rawPayments ?? [], [rawPayments]);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const currency = profile?.currency || "NGN";
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  const handleExportPdf = () => {
    setIsExportModalOpen(true);
  };

  // Category map for rapid lookup
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, CategoryRow>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  // Compute all dashboard metrics pure
  const dashboardData = React.useMemo(() => {
    return computeDashboardData({
      entries,
      categories,
      loans,
      loanPayments,
      period: activePeriod,
      today,
      currency,
    });
  }, [entries, categories, loans, loanPayments, activePeriod, today, currency]);

  const {
    totals,
    leftOverChange,
    totalOwed,
    activeLoans,
    spendingByCategory,
    cashFlowSeries,
    smartTipText,
    recentEntries,
  } = dashboardData;

  // Add Entry Modal state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addModalAction, setAddModalAction] = React.useState<"income" | "expense" | "giving" | "lent">("income");

  const handleOpenAdd = (action: "income" | "expense" | "giving" | "lent" = "income") => {
    setAddModalAction(action);
    setIsAddModalOpen(true);
  };

  // Donut slice click handler -> navigate to records filtered
  const handleCategoryClick = (catId: string) => {
    const recordsPeriod = selectedPreset === "custom" ? "custom" : selectedPreset;
    const params = new URLSearchParams();
    params.set("tab", "expenses");
    if (catId !== "other") {
      params.set("category", catId);
    }
    if (recordsPeriod !== "thisMonth") {
      params.set("period", recordsPeriod);
    }
    router.push(`/records?${params.toString()}`);
  };

  // Screen reader text summaries
  const categorySrSummary = React.useMemo(() => {
    if (spendingByCategory.items.length === 0) {
      return "No expense entries recorded in this period.";
    }
    const details = spendingByCategory.items
      .map((item) => `${item.name} ${item.percent}% (${formatMoney(item.amount_minor, currency)})`)
      .join(", ");
    return `Spending by category summary: Total expenses ${formatMoney(spendingByCategory.total_minor, currency)}. Breakdown: ${details}.`;
  }, [spendingByCategory, currency]);

  const cashFlowSrSummary = React.useMemo(() => {
    return `Income versus Expenses summary: Total income ${formatMoney(totals.moneyIn, currency)}, Total direct expenses ${formatMoney(totals.expenses, currency)}, Total given ${formatMoney(totals.giving, currency)}.`;
  }, [totals, currency]);

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title & Period Switcher */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Financial insights, cash flow trends, and spending breakdown.
            </p>
          </div>

          {/* Desktop Export PDF button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            data-testid="insights-export-pdf-button"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl font-semibold shrink-0 cursor-pointer"
          >
            <FileDown className="size-4" />
            <span>Export PDF</span>
          </Button>
        </div>

        {/* Period Switcher Chips */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Period switcher"
              className="flex flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-1 sm:gap-2"
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
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm cursor-pointer",
                      isSelected
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Phone Export PDF icon button next to period selector */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleExportPdf}
              aria-label="Export PDF"
              data-testid="insights-export-pdf-mobile-button"
              className="sm:hidden size-10 rounded-xl shrink-0 cursor-pointer"
            >
              <FileDown className="size-4" />
            </Button>
          </div>

          {/* Custom Date Range Picker */}
          {selectedPreset === "custom" && (
            <div
              data-testid="custom-date-picker"
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex-1">
                <DateField
                  id="custom-start-date"
                  label="From"
                  value={customRange.start}
                  onChange={(d) => handleCustomDateChange("start", d)}
                />
              </div>
              <div className="flex-1">
                <DateField
                  id="custom-end-date"
                  label="To"
                  value={customRange.end}
                  onChange={(d) => handleCustomDateChange("end", d)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Grid: 1 column on mobile, 2 columns on desktop (>=1024px) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ================================================================= */}
        {/* 1. Left over card                                                 */}
        {/* ================================================================= */}
        <div
          data-testid="insights-left-over-card"
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Left over
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {formatDate(activePeriod.start)} to {formatDate(activePeriod.end)}
            </span>
          </div>

          <div className="mt-3">
            <span
              data-testid="insights-left-over"
              className={cn(
                "text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
                totals.leftOver >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatMoney(totals.leftOver, currency)}
            </span>
          </div>

          {/* Change vs last period badge */}
          <div className="mt-3 flex items-center gap-2">
            <div
              data-testid="insights-left-over-change"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                leftOverChange === "New"
                  ? "border border-border/80 bg-muted/60 text-muted-foreground"
                  : leftOverChange > 0
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : leftOverChange < 0
                      ? "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border border-border/80 bg-muted/60 text-muted-foreground",
              )}
            >
              {leftOverChange === "New" ? (
                <span>New</span>
              ) : leftOverChange > 0 ? (
                <>
                  <TrendingUp className="size-3" />
                  <span>+{leftOverChange}%</span>
                </>
              ) : leftOverChange < 0 ? (
                <>
                  <TrendingDown className="size-3" />
                  <span>{leftOverChange}%</span>
                </>
              ) : (
                <span>0%</span>
              )}
              <span className="text-muted-foreground font-normal">vs last period</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Four tiles 2x2: Income, Expenses, Given, Owed to me             */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Tile 1: Income */}
          <div
            data-testid="insights-tile-income-card"
            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-emerald-500/30 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Income
              </span>
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span
                data-testid="insights-tile-income"
                className="text-lg font-bold tracking-tight text-foreground tabular-nums sm:text-2xl"
              >
                {formatMoney(totals.moneyIn, currency)}
              </span>
            </div>
          </div>

          {/* Tile 2: Expenses */}
          <div
            data-testid="insights-tile-expenses-card"
            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-rose-500/30 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expenses
              </span>
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span
                data-testid="insights-tile-expenses"
                className="text-lg font-bold tracking-tight text-foreground tabular-nums sm:text-2xl"
              >
                {formatMoney(totals.expenses, currency)}
              </span>
            </div>
          </div>

          {/* Tile 3: Giving */}
          <div
            data-testid="insights-tile-given-card"
            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-amber-500/30 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Giving
              </span>
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Heart className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span
                data-testid="insights-tile-given"
                className="text-lg font-bold tracking-tight text-foreground tabular-nums sm:text-2xl"
              >
                {formatMoney(totals.giving, currency)}
              </span>
            </div>
          </div>

          {/* Tile 4: Money I lent */}
          <div
            data-testid="insights-tile-owed-card"
            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-indigo-500/30 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Money I lent
              </span>
              <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <HandCoins className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span
                data-testid="insights-tile-owed"
                className="text-lg font-bold tracking-tight text-foreground tabular-nums sm:text-2xl"
              >
                {formatMoney(totalOwed, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Spending by category: Recharts donut + ranked list             */}
        {/* ================================================================= */}
        <div
          data-testid="insights-spending-by-category-block"
          className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Spending by category
              </h2>
              <p className="text-xs text-muted-foreground">
                Top 5 expense categories plus Other
              </p>
            </div>
            <div className="flex items-center gap-3">
              {spendingByCategory.total_minor > 0 && (
                <span className="hidden text-xs font-semibold text-muted-foreground tabular-nums sm:inline">
                  {formatMoney(spendingByCategory.total_minor, currency)} total
                </span>
              )}
              <Link
                href="/insights/habits"
                data-testid="see-habits-link"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
              >
                See habits
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Screen reader text summary */}
          <div className="sr-only" aria-live="polite">
            {categorySrSummary}
          </div>

          {spendingByCategory.items.length === 0 ? (
            <div
              data-testid="spending-empty-state"
              className="flex flex-1 flex-col items-center justify-center py-10 text-center"
            >
              <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                <ArrowUpRight className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                No expense entries this period
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Add an expense to see your category breakdown and spending share.
              </p>
              <Button
                type="button"
                onClick={() => handleOpenAdd("expense")}
                data-testid="add-first-entry-button"
                className="mt-4 gap-1.5 rounded-full"
                size="sm"
              >
                <Plus className="size-4" />
                Add your first entry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pt-4">
              {/* Donut Chart */}
              <div
                className="relative h-56 w-full"
                data-testid="category-donut-chart"
                aria-hidden="true"
              >
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory.items}
                        dataKey="amount_minor"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        isAnimationActive={false}
                        onClick={(_, index) => {
                          const item = spendingByCategory.items[index];
                          if (item) handleCategoryClick(item.id);
                        }}
                        cursor="pointer"
                      >
                        {spendingByCategory.items.map((item) => (
                          <Cell key={item.id} fill={item.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: unknown) => [
                          formatMoney(Number(val), currency),
                          "Amount",
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--color-card, #171717)",
                          borderColor: "var(--color-border, #333)",
                          borderRadius: "0.75rem",
                          fontSize: "0.8125rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </div>

              {/* Ranked list underneath */}
              <div className="space-y-2" data-testid="category-ranked-list">
                {spendingByCategory.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCategoryClick(item.id)}
                    data-testid={`category-row-${item.id}`}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-foreground sm:text-sm">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {item.percent}%
                      </span>
                      <span className="text-xs font-semibold text-foreground tabular-nums sm:text-sm">
                        {formatMoney(item.amount_minor, currency)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 4. Income vs Expenses grouped bars                                */}
        {/* ================================================================= */}
        <div
          data-testid="insights-cash-flow-block"
          className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Income vs Expenses
              </h2>
              <p className="text-xs text-muted-foreground">
                {diffInDays(activePeriod.start, activePeriod.end) <= 21
                  ? "Daily comparison"
                  : "Monthly cash flow overview"}
              </p>
            </div>
          </div>

          {/* Screen reader text summary */}
          <div className="sr-only" aria-live="polite">
            {cashFlowSrSummary}
          </div>

          {totals.moneyIn === 0 && totals.expenses === 0 ? (
            <div
              data-testid="cash-flow-empty-state"
              className="flex flex-1 flex-col items-center justify-center py-10 text-center"
            >
              <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                <TrendingUp className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                No income or expenses to compare yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Record income or expenses to visualize your cash flow balance over time.
              </p>
              <Button
                type="button"
                onClick={() => handleOpenAdd("income")}
                data-testid="add-first-entry-button"
                className="mt-4 gap-1.5 rounded-full"
                size="sm"
              >
                <Plus className="size-4" />
                Add your first entry
              </Button>
            </div>
          ) : (
            <div
              className="mt-4 h-64 w-full pt-2"
              data-testid="income-vs-expenses-chart"
              aria-hidden="true"
            >
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--color-card, #171717)",
                        borderColor: "var(--color-border, #333)",
                        borderRadius: "0.75rem",
                        fontSize: "0.8125rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Loading chart...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 5. Money I lent block                                             */}
        {/* ================================================================= */}
        <div
          data-testid="insights-lent-block"
          className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Money I lent
              </h2>
              <p className="text-xs text-muted-foreground">
                Active loans and expected repayment countdowns
              </p>
            </div>
            <div className="text-right">
              <span
                data-testid="insights-lent-total"
                className="text-sm font-bold text-foreground tabular-nums sm:text-base"
              >
                {formatMoney(totalOwed, currency)}
              </span>
              <p className="text-[11px] text-muted-foreground">Total owed</p>
            </div>
          </div>

          {activeLoans.length === 0 ? (
            <div
              data-testid="lent-empty-state"
              className="flex flex-1 flex-col items-center justify-center py-10 text-center"
            >
              <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                <HandCoins className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                No active loans right now
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Track money you lent with repayment dates, reminders, and progress.
              </p>
              <Button
                type="button"
                onClick={() => handleOpenAdd("lent")}
                data-testid="add-first-entry-button"
                className="mt-4 gap-1.5 rounded-full"
                size="sm"
              >
                <Plus className="size-4" />
                Add your first entry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40 pt-1" data-testid="active-loans-list">
              {activeLoans.map((item) => {
                const { loan, total, balance, status, progressPercent, nextDate, countdown } = item;
                return (
                  <Link
                    key={loan.id}
                    href={`/lent/${loan.id}`}
                    data-testid={`active-loan-${loan.id}`}
                    className="group block py-3.5 transition-colors first:pt-3 last:pb-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {loan.counterparty}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            status === "Overdue" && "bg-destructive/15 text-destructive",
                            status === "Due soon" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                            status === "Active" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {formatMoney(balance, currency)} left
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {progressPercent}% of {formatMoney(total, currency)}
                        </span>
                        {nextDate && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="size-3" />
                            {formatDate(nextDate)} · {countdown}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 6. Smart tip sentence                                             */}
        {/* ================================================================= */}
        <div
          data-testid="insights-smart-tip-card"
          className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <div className="rounded-full bg-emerald-500/15 p-2">
              <Lightbulb className="size-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">
              Smart tip
            </span>
          </div>

          <div className="my-4">
            <p
              data-testid="insights-smart-tip-sentence"
              className="text-base font-semibold leading-relaxed text-foreground sm:text-lg"
            >
              {smartTipText}
            </p>
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground">
            Computed on this device from your spending patterns
          </div>
        </div>

        {/* ================================================================= */}
        {/* 7. Recent entries: last 5 with "See all"                           */}
        {/* ================================================================= */}
        <div
          data-testid="insights-recent-entries-block"
          className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-xs lg:col-span-2 sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Recent entries
              </h2>
              <p className="text-xs text-muted-foreground">
                Last entries in this period
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Link href={`/records?period=${selectedPreset}`}>
                See all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {recentEntries.length === 0 ? (
            <div
              data-testid="recent-entries-empty-state"
              className="flex flex-1 flex-col items-center justify-center py-10 text-center"
            >
              <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                <Calendar className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                No entries in this period
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Add your income, expenses, or gifts to see your recent transactions.
              </p>
              <Button
                type="button"
                onClick={() => handleOpenAdd("income")}
                data-testid="add-first-entry-button"
                className="mt-4 gap-1.5 rounded-full"
                size="sm"
              >
                <Plus className="size-4" />
                Add your first entry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40 pt-1" data-testid="recent-entries-list">
              {recentEntries.map((entry) => {
                const cat = categoryMap.get(entry.category_id);
                const isIncome = entry.kind === "income";
                return (
                  <Link
                    key={entry.id}
                    href={`/records/${entry.id}`}
                    data-testid={`recent-entry-${entry.id}`}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-muted/30 px-1 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-full p-2 text-xs",
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : entry.kind === "giving"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="size-4" />
                        ) : entry.kind === "giving" ? (
                          <Heart className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {cat?.name || "Entry"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.occurred_on)}
                          {entry.counterparty ? ` · ${entry.counterparty}` : ""}
                          {entry.description && !entry.counterparty ? ` · ${entry.description}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap ml-2 text-sm font-bold tabular-nums",
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                      )}
                    >
                      {`${isIncome ? "+" : "-"}${formatMoney(entry.amount_minor, currency)}`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      <EntryModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        action={addModalAction}
        currency={currency}
      />

      {/* Export PDF Modal pre-selected with insights period */}
      <ExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        initialPreset={
          selectedPreset === "thisMonth"
            ? "this_month"
            : selectedPreset === "last3Months"
              ? "last_3_months"
              : selectedPreset === "custom"
                ? "custom"
                : "this_month"
        }
        initialCustomRange={selectedPreset === "custom" ? customRange : undefined}
        currency={currency}
      />
    </div>
  );
}
