"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pause, Play, Trash2, Repeat, Pencil, X } from "lucide-react";
import { useRecurringRules, useCategories } from "@/lib/repo/hooks";
import { updateRecurringRule, softDeleteRecurringRule } from "@/lib/repo";
import type { RecurringRuleRow } from "@/lib/db/dexie";
import { formatDate, formatMoney, toMinor, fromMinor } from "@/lib/format";

export interface RecurringRulesListProps {
  currency?: string;
  limit?: number;
}

export function RecurringRulesList({ currency = "NGN", limit }: RecurringRulesListProps) {
  const rules = useRecurringRules();
  const categories = useCategories();
  const [loadingRuleId, setLoadingRuleId] = React.useState<string | null>(null);

  // Edit modal state
  const [editingRule, setEditingRule] = React.useState<RecurringRuleRow | null>(null);
  const [editAmountStr, setEditAmountStr] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editFrequency, setEditFrequency] = React.useState<"weekly" | "monthly">("monthly");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const activeRules = React.useMemo(() => {
    if (!rules) return [];
    return rules
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  }, [rules]);

  const displayedRules = React.useMemo(() => {
    return limit ? activeRules.slice(0, limit) : activeRules;
  }, [activeRules, limit]);

  const handleOpenEdit = (rule: RecurringRuleRow) => {
    setEditingRule(rule);
    const major = fromMinor(rule.amount_minor);
    const parts = major.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setEditAmountStr(parts.join("."));
    setEditDescription(rule.description || "");
    setEditFrequency(rule.frequency as "weekly" | "monthly");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const minor = toMinor(editAmountStr);
    if (minor <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateRecurringRule(editingRule.id, {
        amount_minor: minor,
        description: editDescription.trim() || null,
        frequency: editFrequency,
      });
      toast.success("Repeating entry updated");
      setEditingRule(null);
    } catch (err) {
      console.error("Failed to update repeating rule", err);
      toast.error("Failed to update entry");
    } finally {
      setIsSavingEdit(false);
    }
  };

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

  // Delete confirm modal state
  const [ruleToDelete, setRuleToDelete] = React.useState<RecurringRuleRow | null>(null);
  const [isDeletingRule, setIsDeletingRule] = React.useState(false);

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
      setIsDeletingRule(true);
      await softDeleteRecurringRule(ruleToDelete.id);
      setRuleToDelete(null);
      toast("Deleted");
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast("Failed to delete. Please try again.");
    } finally {
      setIsDeletingRule(false);
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
      {displayedRules.map((rule) => {
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

            {/* Action buttons: Edit, Pause/Resume and Delete */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                data-testid="rule-edit-btn"
                disabled={isLoading}
                onClick={() => handleOpenEdit(rule)}
                aria-label={`Edit ${displayName}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </button>

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
                onClick={() => setRuleToDelete(rule)}
                aria-label={`Delete ${displayName}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}



      {/* Edit Rule Modal */}
      {editingRule && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Edit repeating entry</h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Salary, Rent, Tithe"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editAmountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const parts = raw.split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    setEditAmountStr(parts.join("."));
                  }}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Repeats</label>
                <select
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value as "weekly" | "monthly")}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="rounded-lg border border-input px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {ruleToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Delete repeating entry?
            </h3>
            <p className="text-sm text-muted-foreground">
              This repeating reminder will be removed. Past records already created will not be affected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingRule}
                onClick={() => setRuleToDelete(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRule}
                data-testid="confirm-delete-rule-btn"
                onClick={confirmDelete}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                {isDeletingRule ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
