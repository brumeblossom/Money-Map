"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pause, Play, Trash2, Repeat } from "lucide-react";
import { useRecurringRules, useCategories } from "@/lib/repo/hooks";
import { updateRecurringRule, softDeleteRecurringRule } from "@/lib/repo";
import type { RecurringRuleRow } from "@/lib/db/dexie";
import { formatDate, formatMoney } from "@/lib/format";

export interface RecurringRulesListProps {
  currency?: string;
}

export function RecurringRulesList({ currency = "NGN" }: RecurringRulesListProps) {
  const rules = useRecurringRules();
  const categories = useCategories();
  const [loadingRuleId, setLoadingRuleId] = React.useState<string | null>(null);

  const activeRules = React.useMemo(() => {
    if (!rules) return [];
    return rules
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  }, [rules]);

  const handleTogglePause = async (rule: RecurringRuleRow) => {
    try {
      setLoadingRuleId(rule.id);
      const nextPaused = !rule.is_paused;
      await updateRecurringRule(rule.id, { is_paused: nextPaused });
      toast(nextPaused ? "Paused" : "Resumed");
    } catch (err) {
      console.error("Failed to toggle rule pause state", err);
      toast("Failed to update status. Please try again.");
    } finally {
      setLoadingRuleId(null);
    }
  };

  const handleDelete = async (rule: RecurringRuleRow) => {
    try {
      setLoadingRuleId(rule.id);
      await softDeleteRecurringRule(rule.id);
      toast("Deleted");
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast("Failed to delete. Please try again.");
    } finally {
      setLoadingRuleId(null);
    }
  };

  if (!rules) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading repeating entries...
      </div>
    );
  }

  if (activeRules.length === 0) {
    return (
      <div
        data-testid="no-recurring-rules"
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 px-4 text-center"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
          <Repeat className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No repeating entries yet</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          When you add an income, expense, or giving entry and set Repeats to Weekly or Monthly, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="recurring-rules-list">
      {activeRules.map((rule) => {
        const cat = categories?.find((c) => c.id === rule.category_id);
        const displayName =
          rule.description?.trim() || rule.counterparty?.trim() || cat?.name || "Entry";
        const formattedAmount = formatMoney(rule.amount_minor, currency);
        const formattedNextDate = formatDate(rule.next_due_on);
        const frequencyLabel =
          rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1);
        const isLoading = loadingRuleId === rule.id;

        return (
          <div
            key={rule.id}
            data-testid={`recurring-rule-row-${rule.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-border"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  rule.is_paused
                    ? "bg-muted text-muted-foreground"
                    : rule.kind === "income"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                <Repeat className="size-4.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {displayName}
                  </h4>
                  <span
                    data-testid="rule-status-badge"
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      rule.is_paused
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {rule.is_paused ? "Paused" : "Active"}
                  </span>
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">
                    {rule.kind}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold text-foreground tabular-nums">
                    {formattedAmount}
                  </span>
                  <span>•</span>
                  <span>{frequencyLabel}</span>
                  <span>•</span>
                  <span>Next: {formattedNextDate}</span>
                </div>
              </div>
            </div>

            {/* Action buttons: Pause/Resume and Delete */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                data-testid={rule.is_paused ? "rule-resume-btn" : "rule-pause-btn"}
                disabled={isLoading}
                onClick={() => handleTogglePause(rule)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors border ${
                  rule.is_paused
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "border-border bg-background text-foreground hover:bg-muted"
                } disabled:opacity-50 cursor-pointer`}
              >
                {rule.is_paused ? (
                  <>
                    <Play className="size-3.5" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="size-3.5" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="rule-delete-btn"
                disabled={isLoading}
                onClick={() => handleDelete(rule)}
                aria-label={`Delete ${displayName}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
