"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit2,
  FileText,
  Tag,
  Trash2,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { softDeleteEntry, restoreEntry } from "@/lib/repo";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RecordExportBar } from "@/components/record-export-bar";
import { buildSingleEntryReport } from "@/lib/report/builder";

export interface RecordDetailViewProps {
  id: string;
}

export function RecordDetailView({ id }: RecordDetailViewProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const entry = useLiveQuery(async () => {
    return await db.entries.get(id);
  }, [id]);

  const category = useLiveQuery(async () => {
    if (!entry?.category_id) return null;
    return await db.categories.get(entry.category_id);
  }, [entry?.category_id]);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const currency = profile?.currency || "NGN";

  if (entry === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entry || entry.deleted_at !== null) {
    return (
      <div className="space-y-4 p-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Entry not found</h2>
        <p className="text-sm text-muted-foreground">
          This entry may have been deleted or does not exist.
        </p>
        <Link href="/records">
          <Button variant="outline" className="mt-4 rounded-xl">
            Back to Records
          </Button>
        </Link>
      </div>
    );
  }

  const tab = entry.kind === "expense" ? "expenses" : entry.kind;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await softDeleteEntry(entry.id);
      setShowDeleteConfirm(false);
      router.push(`/records?tab=${tab}`);

      toast("Entry deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreEntry(entry.id);
          },
        },
      });
    } catch (err) {
      console.error("Failed to delete entry:", err);
      toast("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const isIncome = entry.kind === "income";
  const isExpense = entry.kind === "expense";
  const isGiving = entry.kind === "giving";

  const actionLabel = isIncome ? "Income" : isExpense ? "Expenses" : "Giving";
  const counterpartyLabel = isIncome ? "Source" : isGiving ? "Recipient" : "Counterparty";

  const formattedAmount = isIncome
    ? `+${formatMoney(entry.amount_minor, currency)}`
    : `-${formatMoney(entry.amount_minor, currency)}`;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push(`/records?tab=${tab}`);
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Records</span>
        </button>
        <div className="flex items-center gap-2">
          <Link href={`/records/${entry.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              data-testid="detail-edit-button"
              className="gap-1.5 rounded-xl"
            >
              <Edit2 className="size-3.5" />
              <span>Edit</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            data-testid="detail-delete-button"
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-1.5 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Amount & Kind Hero */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2">
          {isIncome && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="size-3.5" />
              {actionLabel}
            </span>
          )}
          {isExpense && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="size-3.5" />
              {actionLabel}
            </span>
          )}
          {isGiving && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
              <Heart className="size-3.5" />
              {actionLabel}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(entry.occurred_on)}</span>
        </div>
        <div className="mt-3">
          <h1
            data-testid="detail-amount"
            className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${
              isIncome
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground"
            }`}
          >
            {formattedAmount}
          </h1>
        </div>
      </div>

      {/* Details Card */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Details
        </h2>
        <dl className="mt-4 divide-y divide-border/40 text-sm">
          {/* Category */}
          <div className="flex items-center justify-between py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Tag className="size-4" />
              <span>Category</span>
            </dt>
            <dd className="font-medium text-foreground">
              {category?.name || "Uncategorised"}
            </dd>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              <span>Date</span>
            </dt>
            <dd className="font-medium text-foreground">
              {formatDate(entry.occurred_on)}
            </dd>
          </div>

          {/* Counterparty / Source / Recipient if set */}
          {entry.counterparty && (
            <div className="flex items-center justify-between py-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4" />
                <span>{counterpartyLabel}</span>
              </dt>
              <dd className="font-medium text-foreground">{entry.counterparty}</dd>
            </div>
          )}

          {/* Description / Note if set */}
          {entry.description && (
            <div className="py-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <FileText className="size-4" />
                <span>Description</span>
              </dt>
              <dd className="mt-1.5 font-normal whitespace-pre-wrap text-foreground">
                {entry.description}
              </dd>
            </div>
          )}

          {/* Entry ID */}
          <div className="flex items-center justify-between py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4" />
              <span>Reference ID</span>
            </dt>
            <dd className="font-mono text-xs text-muted-foreground">
              {entry.id.slice(0, 8)}...
            </dd>
          </div>
        </dl>
      </div>

      {/* Export & Share buttons (Prompt 16 / US-8.1, US-8.2) */}
      <RecordExportBar
        type="entries"
        id={entry.id}
        date={entry.occurred_on}
        kind={entry.kind}
        getSnapshot={(hideDetails) =>
          buildSingleEntryReport({
            entry,
            categoryName: category?.name || "Uncategorised",
            currency,
            userName: profile?.display_name || "",
            hideDetails,
            repeats: entry.recurring_rule_id ? "Monthly" : "No",
          })
        }
      />

      {/* Delete Confirmation Modal / Alert */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Delete this entry?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This entry will be removed from your records. You can undo this action within 5 seconds.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
