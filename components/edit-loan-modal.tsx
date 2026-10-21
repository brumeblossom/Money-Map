"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountField } from "@/components/amount-field";
import { DateField } from "@/components/date-field";
import { CategoryPicker } from "@/components/category-picker";
import { loanFormSchema } from "@/lib/schemas";
import { updateLoan, createCategory, toSlug, type LoanRow, type RepeatPlan, type InterestKind } from "@/lib/repo";
import { totalToGetBack, instalmentCount, suggestedInstalment } from "@/lib/calc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface EditLoanModalProps {
  open: boolean;
  onClose: () => void;
  loan: LoanRow;
  currency?: string;
  onSuccess?: () => void;
}

interface EditLoanFormInnerProps {
  onClose: () => void;
  loan: LoanRow;
  currency: string;
  onSuccess?: () => void;
}

function EditLoanFormInner({
  onClose,
  loan,
  currency,
  onSuccess,
}: EditLoanFormInnerProps) {
  const [borrower, setBorrower] = React.useState(loan.counterparty);
  const [amountMinor, setAmountMinor] = React.useState(loan.principal_minor);
  const [categoryId, setCategoryId] = React.useState(loan.category_id);
  const [customCategoryName, setCustomCategoryName] = React.useState("");
  const [dateLent, setDateLent] = React.useState(loan.started_on);
  const [expectedBackBy, setExpectedBackBy] = React.useState(loan.due_on);
  const [plan, setPlan] = React.useState<RepeatPlan>(loan.plan);
  const [customInstalmentMinor, setCustomInstalmentMinor] = React.useState<number | null>(
    loan.instalment_minor,
  );
  const [interestType, setInterestType] = React.useState<InterestKind>(loan.interest_type);
  const [interestInputText, setInterestInputText] = React.useState<string>(() => {
    if (loan.interest_type === "none" || loan.interest_value === 0) return "";
    return (loan.interest_value / 100).toString();
  });
  const [remind, setRemind] = React.useState<boolean>(loan.remind);
  const [description, setDescription] = React.useState<string>(loan.description ?? "");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Compute interest value
  const interestValue = (() => {
    if (interestType === "none" || !interestInputText) return 0;
    const num = parseFloat(interestInputText.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) return 0;
    if (interestType === "percent") {
      return Math.round(num * 100);
    }
    if (interestType === "flat") {
      return Math.round(num * 100);
    }
    return 0;
  })();

  // Compute suggested instalment
  const suggestedInstalmentValue = (() => {
    if (plan === "weekly" || plan === "monthly") {
      if (amountMinor > 0 && expectedBackBy >= dateLent) {
        const total = totalToGetBack(amountMinor, interestType, interestValue);
        const count = instalmentCount(dateLent, expectedBackBy, plan);
        return suggestedInstalment(total, count);
      }
    }
    return 0;
  })();

  const activeInstalmentMinor = customInstalmentMinor ?? suggestedInstalmentValue;

  const isOther = categoryId === "__other__";
  const hasValidCategory = isOther ? customCategoryName.trim().length > 0 : categoryId.length > 0;
  const hasBorrower = borrower.trim().length > 0 && borrower.trim().length <= 80;
  const isValidAmount = amountMinor > 0 && amountMinor <= 99999999999999;
  const isValidDates = dateLent.length === 10 && expectedBackBy.length === 10 && expectedBackBy >= dateLent;
  const canSave = hasBorrower && isValidAmount && hasValidCategory && isValidDates && !isSubmitting;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalCategoryId = categoryId;
      if (isOther) {
        const trimmedName = customCategoryName.trim();
        const createdCat = await createCategory({
          scope: "lent",
          name: trimmedName,
          slug: toSlug(trimmedName),
          is_default: false,
        });
        finalCategoryId = createdCat.id;
      }

      loanFormSchema.parse({
        counterparty: borrower.trim(),
        principal_minor: amountMinor,
        category_id: finalCategoryId,
        started_on: dateLent,
        due_on: expectedBackBy,
        plan,
        instalment_minor: activeInstalmentMinor > 0 ? activeInstalmentMinor : null,
        interest_type: interestType,
        interest_value: interestValue,
        remind,
        description: description.trim() || null,
      });

      const previousValues = { ...loan };

      await updateLoan(loan.id, {
        counterparty: borrower.trim(),
        principal_minor: amountMinor,
        category_id: finalCategoryId,
        started_on: dateLent,
        due_on: expectedBackBy,
        plan,
        instalment_minor: activeInstalmentMinor > 0 ? activeInstalmentMinor : null,
        interest_type: interestType,
        interest_value: interestValue,
        remind,
        description: description.trim() || null,
      });

      onClose();
      onSuccess?.();

      toast("Saved", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await updateLoan(loan.id, {
              counterparty: previousValues.counterparty,
              principal_minor: previousValues.principal_minor,
              category_id: previousValues.category_id,
              started_on: previousValues.started_on,
              due_on: previousValues.due_on,
              plan: previousValues.plan,
              instalment_minor: previousValues.instalment_minor,
              interest_type: previousValues.interest_type,
              interest_value: previousValues.interest_value,
              remind: previousValues.remind,
              description: previousValues.description,
            });
          },
        },
      });
    } catch (err: unknown) {
      console.error("Update loan error:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update loan. Please check your inputs.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex max-h-[min(640px,90dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in zoom-in-95">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <h2 id="edit-loan-title" className="text-lg font-bold tracking-tight text-foreground">
          Edit loan
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
      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 overscroll-contain">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Borrower */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-borrower" className="text-sm font-medium text-foreground">
              Borrower <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-borrower"
              type="text"
              maxLength={80}
              value={borrower}
              onChange={(e) => setBorrower(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          {/* Amount lent */}
          <AmountField
            label="Amount lent"
            value={amountMinor}
            onChange={setAmountMinor}
            currency={currency}
            required
          />

          {/* Category */}
          <CategoryPicker
            scope="lent"
            value={categoryId}
            customName={customCategoryName}
            onChange={(selId) => setCategoryId(selId)}
            onCustomNameChange={setCustomCategoryName}
            required
          />

          {/* Date lent */}
          <DateField
            label="Date lent"
            value={dateLent}
            onChange={setDateLent}
            required
          />

          {/* Expected back by */}
          <DateField
            label="Expected back by"
            value={expectedBackBy}
            onChange={setExpectedBackBy}
            required
          />

          {/* Payback plan */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-plan-select" className="text-sm font-medium text-foreground">
              Payback plan (optional)
            </label>
            <select
              id="edit-plan-select"
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value as RepeatPlan);
                setCustomInstalmentMinor(null);
              }}
              className="flex h-11 w-full appearance-none items-center justify-between rounded-xl border border-input bg-background/50 px-3.5 py-2 text-base text-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              <option value="one_payment">One payment</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Instalment amount */}
          {plan !== "one_payment" && (
            <AmountField
              label="Instalment amount (optional)"
              value={activeInstalmentMinor}
              onChange={(val) => setCustomInstalmentMinor(val)}
              currency={currency}
            />
          )}

          {/* Interest */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Interest (optional)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInterestType("none");
                  setInterestInputText("");
                }}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                  interestType === "none"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 text-muted-foreground border-input hover:text-foreground",
                )}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setInterestType("percent")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                  interestType === "percent"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 text-muted-foreground border-input hover:text-foreground",
                )}
              >
                Percent (%)
              </button>
              <button
                type="button"
                onClick={() => setInterestType("flat")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                  interestType === "flat"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 text-muted-foreground border-input hover:text-foreground",
                )}
              >
                Flat ({currency === "NGN" ? "₦" : currency})
              </button>
            </div>

            {interestType !== "none" && (
              <div className="mt-1 flex items-center rounded-xl border border-input bg-background/50 px-3.5 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={interestType === "percent" ? "e.g. 5" : "0.00"}
                  value={interestInputText}
                  onChange={(e) => setInterestInputText(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                />
                <span className="text-xs font-semibold text-muted-foreground">
                  {interestType === "percent" ? "%" : currency === "NGN" ? "₦" : currency}
                </span>
              </div>
            )}
          </div>

          {/* Remind me */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-foreground">Remind me</span>
            <button
              type="button"
              role="switch"
              aria-checked={remind}
              onClick={() => setRemind(!remind)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                remind ? "bg-primary" : "bg-input",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                  remind ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-description" className="text-sm font-medium text-foreground">
              Description (optional)
            </label>
            <textarea
              id="edit-description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-xl border border-input bg-background/50 px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            />
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border/50 bg-background/95 px-5 py-3">
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
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function EditLoanModal({
  open,
  onClose,
  loan,
  currency = "NGN",
  onSuccess,
}: EditLoanModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-loan-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0"
    >
      <EditLoanFormInner
        key={loan.id}
        onClose={onClose}
        loan={loan}
        currency={currency}
        onSuccess={onSuccess}
      />
    </div>
  );
}
