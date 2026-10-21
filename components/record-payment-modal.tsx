"use client";

import * as React from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountField } from "@/components/amount-field";
import { DateField } from "@/components/date-field";
import { loanPaymentFormSchema } from "@/lib/schemas";
import { createLoanPayment, updateLoanPayment, softDeleteLoanPayment, type LoanPaymentRow } from "@/lib/repo";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  loanId: string;
  balanceLeftMinor: number;
  currency?: string;
  paymentToEdit?: LoanPaymentRow | null;
  onSuccess?: () => void;
}

interface FormInnerProps {
  onClose: () => void;
  loanId: string;
  balanceLeftMinor: number;
  currency: string;
  paymentToEdit?: LoanPaymentRow | null;
  onSuccess?: () => void;
}

function RecordPaymentFormInner({
  onClose,
  loanId,
  balanceLeftMinor,
  currency,
  paymentToEdit,
  onSuccess,
}: FormInnerProps) {
  const isEdit = !!paymentToEdit;

  const [amountMinor, setAmountMinor] = React.useState<number>(
    () => paymentToEdit?.amount_minor ?? 0,
  );
  const [paidOn, setPaidOn] = React.useState<string>(
    () => paymentToEdit?.paid_on ?? new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = React.useState<string>(() => paymentToEdit?.note ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Overpayment detection: amount entered exceeds balance left (adjusting for edit if needed)
  const effectiveBalanceLeft = isEdit
    ? balanceLeftMinor + (paymentToEdit?.amount_minor ?? 0)
    : balanceLeftMinor;
  const isOverpayment = amountMinor > 0 && amountMinor > effectiveBalanceLeft;

  const isValidAmount = amountMinor > 0 && amountMinor <= 99999999999999;
  const isValidDate = paidOn.length === 10;
  const canSave = isValidAmount && isValidDate && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      loanPaymentFormSchema.parse({
        loan_id: loanId,
        amount_minor: amountMinor,
        paid_on: paidOn,
        note: note.trim() || null,
      });

      if (isEdit && paymentToEdit) {
        const previousAmount = paymentToEdit.amount_minor;
        const previousPaidOn = paymentToEdit.paid_on;
        const previousNote = paymentToEdit.note;

        await updateLoanPayment(paymentToEdit.id, {
          amount_minor: amountMinor,
          paid_on: paidOn,
          note: note.trim() || null,
        });

        onClose();
        onSuccess?.();

        toast("Saved", {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: async () => {
              await updateLoanPayment(paymentToEdit.id, {
                amount_minor: previousAmount,
                paid_on: previousPaidOn,
                note: previousNote,
              });
            },
          },
        });
      } else {
        const newPayment = await createLoanPayment({
          loan_id: loanId,
          amount_minor: amountMinor,
          paid_on: paidOn,
          note: note.trim() || null,
        });

        onClose();
        onSuccess?.();

        toast("Saved", {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: async () => {
              await softDeleteLoanPayment(newPayment.id);
            },
          },
        });
      }
    } catch (err: unknown) {
      console.error("Save payment error:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to record payment. Please check your inputs.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <h2 id="record-payment-title" className="text-lg font-bold tracking-tight text-foreground">
          {isEdit ? "Edit money received" : "Record money received"}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-4 px-5 py-4">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Amount (Required) */}
          <AmountField
            label="Amount"
            value={amountMinor}
            onChange={setAmountMinor}
            currency={currency}
            required
            autoFocus
          />

          {/* Overpayment Warning */}
          {isOverpayment && (
            <div
              data-testid="overpayment-warning"
              className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 animate-in fade-in-0"
            >
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">
                  This is more than the {formatMoney(effectiveBalanceLeft, currency)} left. Save anyway?
                </p>
                <p className="text-xs text-muted-foreground">
                  Recording this amount will result in an overpayment and set the balance left to {formatMoney(0, currency)}.
                </p>
              </div>
            </div>
          )}

          {/* Date (Required) */}
          <DateField
            label="Date"
            value={paidOn}
            onChange={setPaidOn}
            required
          />

          {/* Note (Optional, max 200) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-note-input" className="text-sm font-medium text-foreground">
              Note (optional)
            </label>
            <Input
              id="payment-note-input"
              type="text"
              placeholder="e.g. First instalment, bank transfer"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {/* Sticky/Fixed Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border/50 bg-background/95 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave}
            className="rounded-xl px-5 font-semibold"
          >
            {isSubmitting ? "Saving..." : isOverpayment ? "Save anyway" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RecordPaymentModal({
  open,
  onClose,
  loanId,
  balanceLeftMinor,
  currency = "NGN",
  paymentToEdit,
  onSuccess,
}: RecordPaymentModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0"
    >
      <RecordPaymentFormInner
        key={paymentToEdit ? paymentToEdit.id : "new-payment"}
        onClose={onClose}
        loanId={loanId}
        balanceLeftMinor={balanceLeftMinor}
        currency={currency}
        paymentToEdit={paymentToEdit}
        onSuccess={onSuccess}
      />
    </div>
  );
}
