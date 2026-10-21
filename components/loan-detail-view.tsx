"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordPaymentModal } from "@/components/record-payment-modal";
import { EditLoanModal } from "@/components/edit-loan-modal";
import {
  db,
  getLoan,
  softDeleteLoan,
  restoreLoan,
  softDeleteLoanPayment,
  restoreLoanPayment,
  type LoanPaymentRow,
} from "@/lib/repo";
import { useLoanPayments, useCategories } from "@/lib/repo/hooks";
import {
  totalToGetBack,
  interestAmount,
  receivedSoFar,
  balanceLeft,
  loanStatus,
  loanProgress,
  instalmentDates,
  instalmentCount,
  suggestedInstalment,
} from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LoanDetailViewProps {
  id: string;
  currency?: string;
}

export function LoanDetailView({ id, currency = "NGN" }: LoanDetailViewProps) {
  const router = useRouter();

  const loan = useLiveQuery(() => getLoan(id, db), [id]);
  const payments = useLoanPayments(id) ?? [];
  const categories = useCategories("lent") ?? [];

  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<LoanPaymentRow | null>(null);
  const [isEditLoanModalOpen, setIsEditLoanModalOpen] = React.useState(false);

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (loan === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading loan details...</div>
      </div>
    );
  }

  if (loan === null || loan.deleted_at !== null) {
    return (
      <div className="space-y-4 py-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Loan not found</h2>
        <p className="text-sm text-muted-foreground">
          This loan may have been deleted or does not exist.
        </p>
        <Link href="/lent">
          <Button variant="outline" className="mt-2 rounded-xl">
            <ArrowLeft className="mr-2 size-4" /> Back to Money I lent
          </Button>
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === loan.category_id);
  const categoryName = category?.name ?? "Lent";

  // Calculations
  const interestVal = interestAmount(loan.principal_minor, loan.interest_type, loan.interest_value);
  const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
  const received = receivedSoFar(payments);
  const balance = balanceLeft(total, received);
  const status = loanStatus(today, loan, payments);
  const progressRatio = loanProgress(total, received);
  const progressPercent = Math.min(100, Math.round(progressRatio * 100));

  const n = instalmentCount(loan.started_on, loan.due_on, loan.plan);
  const expectedInstalmentMinor = loan.instalment_minor ?? suggestedInstalment(total, n);
  const timelineDates = instalmentDates(loan.started_on, loan.due_on, loan.plan);

  const sortedPayments = [...payments].sort((a, b) => b.paid_on.localeCompare(a.paid_on));

  const handleDeleteLoan = async () => {
    if (!confirm(`Are you sure you want to delete the loan to "${loan.counterparty}"?`)) {
      return;
    }

    await softDeleteLoan(loan.id);
    router.push("/lent");

    toast("Loan deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          await restoreLoan(loan.id);
        },
      },
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    await softDeleteLoanPayment(paymentId);
    toast("Payment deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          await restoreLoanPayment(paymentId);
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 py-2 pb-16">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/lent"
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 size-4" /> Money I lent
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {loan.counterparty}
              </h1>
              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                  status === "Paid off" &&
                    "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  status === "Due soon" &&
                    "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  status === "Overdue" &&
                    "border-destructive/30 bg-destructive/15 text-destructive",
                  status === "Active" &&
                    "border-border bg-secondary text-secondary-foreground",
                )}
              >
                {status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{categoryName}</p>
          </div>

          {/* Loan Actions: Edit & Delete */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditLoanModalOpen(true)}
              className="rounded-xl"
            >
              <Pencil className="mr-1.5 size-3.5" /> Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteLoan}
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
        {/* Metric Boxes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/40 bg-background/50 p-4">
            <span className="text-xs font-medium text-muted-foreground">Total to get back</span>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(total, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/50 p-4">
            <span className="text-xs font-medium text-muted-foreground">Received so far</span>
            <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(received, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/50 p-4">
            <span className="text-xs font-medium text-muted-foreground">Balance left</span>
            <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(balance, currency)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Repayment progress</span>
            <span className="font-semibold text-foreground">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                status === "Paid off" ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Loan Details Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/40 pt-5 text-sm sm:grid-cols-4">
          <div>
            <span className="text-xs text-muted-foreground">Date lent</span>
            <p className="mt-0.5 font-medium text-foreground">{formatDate(loan.started_on)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Expected back by</span>
            <p className="mt-0.5 font-medium text-foreground">{formatDate(loan.due_on)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Payback plan</span>
            <p className="mt-0.5 font-medium text-foreground capitalize">
              {loan.plan === "weekly"
                ? "Weekly"
                : loan.plan === "monthly"
                  ? "Monthly"
                  : "One payment"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Instalment amount</span>
            <p className="mt-0.5 font-medium text-foreground">
              {formatMoney(expectedInstalmentMinor, currency)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Principal</span>
            <p className="mt-0.5 font-medium text-foreground">
              {formatMoney(loan.principal_minor, currency)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Interest</span>
            <p className="mt-0.5 font-medium text-foreground">
              {loan.interest_type === "none" || loan.interest_value === 0
                ? "None (0%)"
                : loan.interest_type === "percent"
                  ? `${loan.interest_value / 100}% (${formatMoney(interestVal, currency)})`
                  : `${formatMoney(loan.interest_value, currency)} flat`}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Reminders</span>
            <p className="mt-0.5 font-medium text-foreground">{loan.remind ? "Enabled" : "Off"}</p>
          </div>
          {loan.description && (
            <div className="col-span-2 sm:col-span-4">
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="mt-0.5 font-normal text-muted-foreground">{loan.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Money Received Action Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Repayments</h2>
        <Button
          type="button"
          onClick={() => {
            setEditingPayment(null);
            setIsRecordModalOpen(true);
          }}
          className="rounded-xl px-4 font-semibold"
        >
          <Plus className="mr-1.5 size-4" /> Record money received
        </Button>
      </div>

      {/* Instalment Timeline */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
        <h3 className="text-base font-bold tracking-tight text-foreground">Instalment timeline</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {timelineDates.length} expected milestone{timelineDates.length === 1 ? "" : "s"}
        </p>

        <div className="mt-4 space-y-3">
          {timelineDates.map((dateStr, idx) => {
            const milestoneTarget = Math.min((idx + 1) * expectedInstalmentMinor, total);
            const isMilestoneMet = received >= milestoneTarget;
            const isMilestoneOverdue = !isMilestoneMet && today > dateStr;

            return (
              <div
                key={dateStr + idx}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isMilestoneMet
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : isMilestoneOverdue
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isMilestoneMet ? (
                      <CheckCircle2 className="size-4" />
                    ) : isMilestoneOverdue ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Instalment {idx + 1} of {timelineDates.length}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      <span>{formatDate(dateStr)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {formatMoney(expectedInstalmentMinor, currency)}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isMilestoneMet
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isMilestoneOverdue
                          ? "text-destructive"
                          : "text-muted-foreground",
                    )}
                  >
                    {isMilestoneMet ? "Received" : isMilestoneOverdue ? "Overdue" : "Upcoming"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List of Money Received */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
        <h3 className="text-base font-bold tracking-tight text-foreground">Money received</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {sortedPayments.length} payment{sortedPayments.length === 1 ? "" : "s"} recorded
        </p>

        {sortedPayments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-8 text-center">
            <HandCoins className="size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No repayments recorded yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPayment(null);
                setIsRecordModalOpen(true);
              }}
              className="mt-3 rounded-xl"
            >
              <Plus className="mr-1.5 size-3.5" /> Record money received
            </Button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border/40">
            {sortedPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
              >
                <div className="space-y-0.5">
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(p.amount_minor, currency)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(p.paid_on)}</span>
                    {p.note && (
                      <>
                        <span>•</span>
                        <span className="italic text-foreground/80">{p.note}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditingPayment(p);
                      setIsRecordModalOpen(true);
                    }}
                    aria-label="Edit payment"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeletePayment(p.id)}
                    aria-label="Delete payment"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record / Edit Payment Modal */}
      <RecordPaymentModal
        open={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingPayment(null);
        }}
        loanId={loan.id}
        balanceLeftMinor={balance}
        currency={currency}
        paymentToEdit={editingPayment}
      />

      {/* Edit Loan Modal */}
      <EditLoanModal
        open={isEditLoanModalOpen}
        onClose={() => setIsEditLoanModalOpen(false)}
        loan={loan}
        currency={currency}
      />
    </div>
  );
}
