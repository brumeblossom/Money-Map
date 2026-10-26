"use client";

import * as React from "react";
import Link from "next/link";
import { HandCoins, ChevronDown, ChevronRight, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditLoanModal } from "@/components/edit-loan-modal";
import { useLoans, useLoanPayments } from "@/lib/repo/hooks";
import { softDeleteLoan, restoreLoan, type LoanRow } from "@/lib/repo";
import {
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  loanStatus,
  loanProgress,
  nextExpectedDate,
  loanCountdown,
  type LoanStatus,
} from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LentListViewProps {
  currency?: string;
  searchQuery?: string;
  categoryId?: string;
  onAddClick?: () => void;
}

interface LoanItemWithMetrics {
  loan: LoanRow;
  total: number;
  received: number;
  balance: number;
  status: LoanStatus;
  progressPercent: number;
  nextDate: string | null;
  countdown: string;
}

export function LentListView({
  currency = "NGN",
  searchQuery = "",
  categoryId = "all",
}: LentListViewProps) {
  const rawLoans = useLoans();
  const rawPayments = useLoanPayments();
  const loans = React.useMemo(() => rawLoans ?? [], [rawLoans]);
  const allPayments = React.useMemo(() => rawPayments ?? [], [rawPayments]);

  const [isPaidOffExpanded, setIsPaidOffExpanded] = React.useState(false);
  const [loanToEdit, setLoanToEdit] = React.useState<LoanRow | null>(null);

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute metrics for each loan
  const enrichedLoans: LoanItemWithMetrics[] = React.useMemo(() => {
    return loans.map((loan) => {
      const loanPayments = allPayments.filter((p) => p.loan_id === loan.id);
      const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
      const received = receivedSoFar(loanPayments);
      const balance = balanceLeft(total, received);
      const status = loanStatus(today, loan, loanPayments);
      const progress = loanProgress(total, received);
      const progressPercent = Math.min(100, Math.round(progress * 100));
      const nextDate = nextExpectedDate(loan, loanPayments);
      const countdown = loanCountdown(today, nextDate, status);

      return {
        loan,
        total,
        received,
        balance,
        status,
        progressPercent,
        nextDate,
        countdown,
      };
    });
  }, [loans, allPayments, today]);

  // Filter based on searchQuery and categoryId
  const filteredLoans = React.useMemo(() => {
    return enrichedLoans.filter((item) => {
      if (categoryId && categoryId !== "all" && item.loan.category_id !== categoryId) {
        return false;
      }
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const counterparty = (item.loan.counterparty || "").toLowerCase();
        const desc = (item.loan.description || "").toLowerCase();
        if (!counterparty.includes(q) && !desc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedLoans, categoryId, searchQuery]);

  // Separate active loans from paid off loans
  const activeLoans = React.useMemo(() => {
    return filteredLoans.filter((item) => item.status !== "Paid off");
  }, [filteredLoans]);

  const paidOffLoans = React.useMemo(() => {
    return filteredLoans.filter((item) => item.status === "Paid off");
  }, [filteredLoans]);

  // Delete confirmation state
  const [loanToDelete, setLoanToDelete] = React.useState<LoanRow | null>(null);
  const [isDeletingLoan, setIsDeletingLoan] = React.useState(false);

  const handleDeleteLoan = (loan: LoanRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoanToDelete(loan);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    const loanId = loanToDelete.id;
    try {
      setIsDeletingLoan(true);
      await softDeleteLoan(loanId);
      setLoanToDelete(null);
      toast("Loan deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreLoan(loanId);
          },
        },
      });
    } catch (err) {
      console.error("Failed to delete loan", err);
      toast("Failed to delete loan");
    } finally {
      setIsDeletingLoan(false);
    }
  };

  const handleEditLoan = (loan: LoanRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoanToEdit(loan);
  };

  const renderLoanRow = (item: LoanItemWithMetrics) => {
    const { loan, total, received, balance, status, progressPercent, nextDate, countdown } = item;

    return (
      <div
        key={loan.id}
        data-testid="loan-row"
        className="group relative rounded-2xl border border-border/60 bg-card p-4.5 shadow-xs transition-all hover:border-border hover:shadow-sm sm:p-5"
      >
        <Link href={`/lent/${loan.id}`} className="block">
          <div className="flex flex-col gap-3">
            {/* Top row: Borrower, Status badge, Balance left */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {loan.counterparty}
                  </h3>
                  {/* Status Badge */}
                  <span
                    data-testid="loan-status-badge"
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                      status === "Paid off" &&
                        "border-money-income/30 bg-secondary text-money-income",
                      status === "Due soon" &&
                        "border-money-giving/40 bg-money-giving/20 text-money-giving-text",
                      status === "Overdue" &&
                        "border-destructive/30 bg-destructive/15 text-destructive",
                      status === "Active" &&
                        "border-border bg-secondary text-secondary-foreground",
                    )}
                  >
                    {status}
                  </span>
                </div>

                {/* Next Expected Date & Countdown */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {status === "Paid off" ? (
                    <span className="font-medium text-money-income">Paid off</span>
                  ) : nextDate ? (
                    <>
                      <Calendar className="size-3.5" />
                      <span>{formatDate(nextDate)}</span>
                      <span>•</span>
                      <span
                        className={cn(
                          "font-semibold",
                          status === "Overdue"
                            ? "text-destructive"
                            : status === "Due soon"
                              ? "text-money-giving-text"
                              : "text-foreground",
                        )}
                      >
                        {countdown}
                      </span>
                    </>
                  ) : (
                    <span>Due: {formatDate(loan.due_on)}</span>
                  )}
                </div>
              </div>

              {/* Balance Left */}
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Balance left</div>
                <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {formatMoney(balance, currency)}
                </div>
              </div>
            </div>

            {/* Progress Bar & Amount Summary */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMoney(received, currency)} received</span>
                <span>{formatMoney(total, currency)} total</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    status === "Paid off" ? "bg-money-income" : "bg-primary",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Link>

        {/* Row Action Buttons: Edit and Delete */}
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/40 pt-2.5 sm:mt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => handleEditLoan(loan, e)}
            aria-label="Edit loan"
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => handleDeleteLoan(loan, e)}
            aria-label="Delete loan"
            className="rounded-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-2 pb-16">
      {/* Empty State */}
      {loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-12 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HandCoins className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">No loans recorded yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Keep track of money you lend out to friends, family, or colleagues with instalment
            timelines and automated reminders.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Loans List */}
          {activeLoans.length > 0 ? (
            <div className="space-y-3">
              {activeLoans.map((item) => renderLoanRow(item))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/30 p-6 text-center text-sm text-muted-foreground">
              No active loans. All recorded loans are fully paid off!
            </div>
          )}

          {/* Paid Off Section (Collapsible) */}
          {paidOffLoans.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsPaidOffExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-center gap-2">
                  {isPaidOffExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <span>Paid off</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-money-income">
                    {paidOffLoans.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isPaidOffExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {isPaidOffExpanded && (
                <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
                  {paidOffLoans.map((item) => renderLoanRow(item))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Loan Modal */}
      {loanToEdit && (
        <EditLoanModal
          open={!!loanToEdit}
          onClose={() => setLoanToEdit(null)}
          loan={loanToEdit}
          currency={currency}
        />
      )}

      {/* Delete Loan Confirmation Dialog */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Delete loan?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This loan and all its repayments will be removed. You can undo this within 5 seconds.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setLoanToDelete(null)}
                disabled={isDeletingLoan}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteLoan}
                disabled={isDeletingLoan}
                className="rounded-xl"
              >
                {isDeletingLoan ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
