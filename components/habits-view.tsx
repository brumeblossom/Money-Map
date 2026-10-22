"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  Plus,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db/dexie";
import { useEntries, useCategories } from "@/lib/repo/hooks";
import {
  type PeriodPreset,
  getPeriodPreset,
  computeHabitsOverview,
  type HabitLabel,
} from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";
import { EntryModal } from "@/components/entry-modal";
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

export function Sparkline({
  data,
  width = 68,
  height = 24,
  className,
}: {
  data: Array<{ month: string; amount_minor: number }>;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.amount_minor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  let points: string;
  if (range === 0) {
    const midY = height / 2;
    points = `${padding},${midY} ${width - padding},${midY}`;
  } else {
    points = values
      .map((val, i) => {
        const x = padding + (i / (values.length - 1)) * innerWidth;
        const y = padding + innerHeight - ((val - min) / range) * innerHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const isUp = values[values.length - 1] > values[0];
  const isDown = values[values.length - 1] < values[0];
  const strokeColor = isUp
    ? "text-rose-500"
    : isDown
      ? "text-emerald-500"
      : "text-muted-foreground";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-testid="category-sparkline"
      className={cn("overflow-visible shrink-0", strokeColor, className)}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function HabitBadge({ label }: { label: HabitLabel }) {
  let badgeStyle = "bg-muted text-muted-foreground border-border";

  switch (label) {
    case "Rising":
      badgeStyle =
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      break;
    case "Falling":
      badgeStyle =
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      break;
    case "Spike":
      badgeStyle =
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      break;
    case "Steady":
      badgeStyle =
        "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      break;
    case "Not enough data yet":
      badgeStyle = "bg-muted text-muted-foreground border-border";
      break;
  }

  return (
    <span
      data-testid="habit-badge"
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        badgeStyle,
      )}
    >
      {label}
    </span>
  );
}

export function HabitsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params
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
    router.push(`/insights/habits?${params.toString()}`);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomRange({ start, end });
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", start);
    params.set("to", end);
    router.push(`/insights/habits?${params.toString()}`);
  };

  // Profile currency from Dexie
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const currency = profile?.currency ?? "NGN";

  // Data queries
  const rawEntries = useEntries();
  const rawCategories = useCategories();

  const entries = React.useMemo(() => rawEntries ?? [], [rawEntries]);
  const categories = React.useMemo(() => rawCategories ?? [], [rawCategories]);

  // Compute habits overview pure
  const habitsData = React.useMemo(() => {
    return computeHabitsOverview({
      categories,
      entries,
      period: activePeriod,
      currentMonthIso,
      currency,
    });
  }, [categories, entries, activePeriod, currentMonthIso, currency]);

  const { summary, categories: habitCategories, totalPeriodExpenses } = habitsData;

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const hasRisingOrFalling =
    summary.rising.length > 0 || summary.falling.length > 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation & Title */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/insights"
            data-testid="habits-back-button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2
              data-testid="habits-page-title"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Habits
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Spending patterns, momentum, and category trends.
            </p>
          </div>
        </div>

        {/* Period Switcher Chips */}
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

          {/* Custom Date Pickers */}
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

      {/* Habits Summary at the Top (PRD US-7.1 / Section 5.3) */}
      <div
        data-testid="habits-summary-card"
        className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6"
      >
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Habits summary
            </h3>
            <p className="text-xs text-muted-foreground">
              Month-over-month shifts in your spending habits
            </p>
          </div>
        </div>

        {hasRisingOrFalling ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Top 3 Rising */}
            {summary.rising.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <TrendingUp className="size-4" />
                  <span>Rising spending this month</span>
                </div>
                <div className="space-y-2">
                  {summary.rising.map((item) => (
                    <div
                      key={item.categoryId}
                      data-testid={`rising-item-${item.categoryId}`}
                      className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-3 text-xs leading-relaxed text-foreground sm:text-sm"
                    >
                      {item.sentence}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 Falling */}
            {summary.falling.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="size-4" />
                  <span>Falling spending this month</span>
                </div>
                <div className="space-y-2">
                  {summary.falling.map((item) => (
                    <div
                      key={item.categoryId}
                      data-testid={`falling-item-${item.categoryId}`}
                      className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3 text-xs leading-relaxed text-foreground sm:text-sm"
                    >
                      {item.sentence}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground sm:text-sm">
            <div className="rounded-full bg-muted p-2">
              <Zap className="size-4" />
            </div>
            <p>You&apos;re on track. Keep recording to see your habits.</p>
          </div>
        )}
      </div>

      {/* Expense Categories List ranked by amount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Expense categories
            </h3>
            <p className="text-xs text-muted-foreground">
              Ranked by spend in {selectedPreset === "thisMonth" ? "this month" : "selected period"}
            </p>
          </div>
          {totalPeriodExpenses > 0 && (
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {formatMoney(totalPeriodExpenses, currency)} total
            </span>
          )}
        </div>

        {habitCategories.length === 0 ? (
          <div
            data-testid="habits-empty-state"
            className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-12 text-center"
          >
            <p className="text-sm font-semibold text-foreground">
              No expense entries recorded yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Record your expenses to generate habit trends and category reports.
            </p>
            <Button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
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
            data-testid="habit-categories-grid"
            className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2"
          >
            {habitCategories.map((cat) => {
              const queryParams = new URLSearchParams();
              if (selectedPreset !== "thisMonth") {
                queryParams.set("period", selectedPreset);
              }
              if (selectedPreset === "custom") {
                queryParams.set("from", customRange.start);
                queryParams.set("to", customRange.end);
              }
              const qs = queryParams.toString();
              const href = `/insights/habits/${cat.categoryId}${qs ? `?${qs}` : ""}`;

              return (
                <Link
                  key={cat.categoryId}
                  href={href}
                  data-testid={`habit-category-card-${cat.categoryId}`}
                  className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm sm:p-5"
                >
                  <div className="space-y-3">
                    {/* Header Row: Category name and Habit label badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-primary" />
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors sm:text-base">
                          {cat.categoryName}
                        </span>
                      </div>
                      <HabitBadge label={cat.label} />
                    </div>

                    {/* Middle Row: Amount, Share and Sparkline */}
                    <div className="flex items-end justify-between gap-4 pt-1">
                      <div>
                        <div className="text-lg font-bold text-foreground tabular-nums sm:text-xl">
                          {formatMoney(cat.total_minor, currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cat.share}% of expenses
                          {cat.entryCountInPeriod > 0
                            ? ` · ${cat.entryCountInPeriod} ${cat.entryCountInPeriod === 1 ? "entry" : "entries"}`
                            : ""}
                        </div>
                      </div>

                      {/* 6-month sparkline */}
                      <div className="flex flex-col items-end gap-1">
                        <Sparkline data={cat.sparklineTrend} width={76} height={26} />
                        <span className="text-[10px] text-muted-foreground">6-mo trend</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Explanation and Chevron */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <span className="truncate pr-2">{cat.explanation}</span>
                    <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <EntryModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        action="expense"
        currency={currency}
      />
    </div>
  );
}
