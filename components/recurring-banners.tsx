"use client";

import * as React from "react";
import Link from "next/link";
import { Repeat, Check, ArrowRight, SkipForward, HandCoins, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useRecurringRules,
  useCategories,
  useLoans,
  useLoanPayments,
} from "@/lib/repo/hooks";
import { createEntry, advanceRecurringRule } from "@/lib/repo";
import type { RecurringRuleRow } from "@/lib/db/dexie";
import { getRecurringBannerMessage } from "@/lib/calc/recurring";
import { getDueLoans } from "@/lib/calc/reminders";

export interface RecurringBannersProps {
  today?: string;
  currency?: string;
  onEditRule: (rule: RecurringRuleRow) => void;
}

export function RecurringBanners({
  today: propToday,
  currency = "NGN",
  onEditRule,
}: RecurringBannersProps) {
  const rules = useRecurringRules();
  const categories = useCategories();
  const loans = useLoans();
  const loanPayments = useLoanPayments();

  // Dynamic today string that updates if the system or simulated clock changes
  const [internalToday, setInternalToday] = React.useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const currentToday = propToday ?? internalToday;

  React.useEffect(() => {
    if (propToday) return;

    const updateClock = () => {
      const now = new Date().toISOString().slice(0, 10);
      setInternalToday((prev) => (prev !== now ? now : prev));
    };

    const interval = setInterval(updateClock, 500);
    window.addEventListener("focus", updateClock);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", updateClock);
    };
  }, [propToday]);

  const [loadingRuleId, setLoadingRuleId] = React.useState<string | null>(null);

  // 1. Filter due recurring rules: active (non-paused), non-deleted, next_due_on <= currentToday
  const dueRules = React.useMemo(() => {
    if (!rules) return [];
    return rules
      .filter((rule) => {
        if (rule.is_paused) return false;
        if (rule.deleted_at !== null) return false;
        return rule.next_due_on <= currentToday;
      })
      .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  }, [rules, currentToday]);

  // 2. Filter due loans: active, remind = true, balance > 0, next expected date within 3 days or overdue
  const dueLoans = React.useMemo(() => {
    return getDueLoans({
      loans: loans ?? [],
      loanPayments: loanPayments ?? [],
      todayIso: currentToday,
      currency,
    });
  }, [loans, loanPayments, currentToday, currency]);

  // Only shown when something is due
  if (dueRules.length === 0 && dueLoans.length === 0) {
    return null;
  }

  const handleAdd = async (rule: RecurringRuleRow, displayName: string) => {
    try {
      setLoadingRuleId(rule.id);
      // 1. Add entry dated today
      await createEntry({
        kind: rule.kind,
        category_id: rule.category_id,
        amount_minor: rule.amount_minor,
        occurred_on: currentToday,
        counterparty: rule.counterparty,
        description: rule.description,
      });

      // 2. Advance next_due_on by one period
      await advanceRecurringRule(rule.id);
      toast(`Added ${displayName}`);
    } catch (err) {
      console.error("Failed to add recurring entry", err);
      toast("Failed to add entry. Please try again.");
    } finally {
      setLoadingRuleId(null);
    }
  };

  const handleSkip = async (rule: RecurringRuleRow, displayName: string) => {
    try {
      setLoadingRuleId(rule.id);
      // Advance next_due_on by one period without creating any entry
      await advanceRecurringRule(rule.id);
      toast(`Skipped ${displayName}`);
    } catch (err) {
      console.error("Failed to skip recurring rule", err);
      toast("Failed to skip. Please try again.");
    } finally {
      setLoadingRuleId(null);
    }
  };

  return (
    <div
      data-testid="home-due-section"
      className="flex flex-col gap-3"
      role="region"
      aria-label="Due items"
    >
      <div className="flex items-center gap-2 px-0.5">
        <h2
          data-testid="due-section-heading"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Due
        </h2>
      </div>

      {/* 1. Due Loans (US-4.3 & Prompt 15) */}
      {dueLoans.map((item) => (
        <Link
          key={item.loanId}
          href={item.href}
          data-testid={`due-loan-${item.loanId}`}
          className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 p-4 sm:p-5 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <HandCoins className="size-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              data-testid="due-loan-message"
              className="text-sm font-semibold text-foreground sm:text-base leading-snug group-hover:text-primary transition-colors"
            >
              {item.message}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Money I lent • Tap to view loan
            </p>
          </div>
          <ChevronRight className="size-4.5 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ))}

      {/* 2. Due Recurring Rules (US-5.1 & Prompt 14/15) */}
      {dueRules.map((rule) => {
        const cat = categories?.find((c) => c.id === rule.category_id);
        const { message, isPastDue, displayName } = getRecurringBannerMessage(
          rule,
          cat?.name,
          currency,
          currentToday,
        );

        const isLoading = loadingRuleId === rule.id;

        return (
          <div
            key={rule.id}
            data-testid="recurring-banner-card"
            className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-xs transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  isPastDue
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                <Repeat className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  data-testid="recurring-banner-message"
                  className="text-sm font-semibold text-foreground sm:text-base leading-snug"
                >
                  {message}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {rule.frequency} repeating {rule.kind}
                </p>
              </div>
            </div>

            {/* Action buttons: Add it, Edit first, Skip */}
            <div className="flex items-center gap-2 pl-0 sm:pl-12 flex-wrap pt-1">
              <button
                type="button"
                data-testid="recurring-banner-add"
                disabled={isLoading}
                onClick={() => handleAdd(rule, displayName)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>Add it</span>
              </button>

              <button
                type="button"
                data-testid="recurring-banner-edit"
                disabled={isLoading}
                onClick={() => onEditRule(rule)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                <ArrowRight className="size-3.5" />
                <span>Edit first</span>
              </button>

              <button
                type="button"
                data-testid="recurring-banner-skip"
                disabled={isLoading}
                onClick={() => handleSkip(rule, displayName)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                <SkipForward className="size-3.5" />
                <span>Skip</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
