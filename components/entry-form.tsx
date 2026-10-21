"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { cn } from "cn";
import {
  db,
  type CategoryScope,
  type EntryKind,
  type RepeatPlan,
  type InterestKind,
} from "@/lib/db/dexie";
import {
  createEntry,
  createCategory,
  softDeleteEntry,
  listEntries,
  createLoan,
  softDeleteLoan,
} from "@/lib/repo";
import { toSlug } from "@/lib/repo/seed";
import {
  incomeFormSchema,
  expenseFormSchema,
  givingFormSchema,
  loanFormSchema,
} from "@/lib/schemas";
import {
  totalToGetBack,
  instalmentCount,
  suggestedInstalment,
} from "@/lib/calc";
import { AmountField } from "@/components/amount-field";
import { DateField } from "@/components/date-field";
import { CategoryPicker, OTHER_CATEGORY_VALUE } from "@/components/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EntryFormProps {
  action: string;
  onClose?: () => void;
  currency?: string;
}

export function EntryForm({ action, onClose, currency = "NGN" }: EntryFormProps) {
  const router = useRouter();

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.push("/");
    }
  }, [onClose, router]);

  const isValidAction =
    action === "income" || action === "expense" || action === "giving" || action === "lent";

  if (!isValidAction) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">{action}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
        <Button onClick={handleClose} className="mt-6 rounded-xl">
          Close
        </Button>
      </div>
    );
  }

  if (action === "lent") {
    return <LentEntryForm onClose={handleClose} currency={currency} />;
  }

  return (
    <StandardEntryForm
      action={action as "income" | "expense" | "giving"}
      onClose={handleClose}
      currency={currency}
    />
  );
}

// ============================================================================
// Standard Entry Form (Money in, Money out, Giving)
// ============================================================================
function StandardEntryForm({
  action,
  onClose,
  currency,
}: {
  action: "income" | "expense" | "giving";
  onClose: () => void;
  currency: string;
}) {
  const kind: EntryKind = action;
  const scope: CategoryScope = action;

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [amountMinor, setAmountMinor] = React.useState<number>(0);
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [customCategoryName, setCustomCategoryName] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(today);
  const [counterparty, setCounterparty] = React.useState<string>("");
  const [repeats, setRepeats] = React.useState<"No" | "Weekly" | "Monthly">("No");
  const [description, setDescription] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const userSelectedRef = React.useRef(false);

  // Set default category to last used for this action
  React.useEffect(() => {
    let isMounted = true;
    async function loadLastCategory() {
      try {
        const activeEntries = await listEntries({ kind });
        activeEntries.sort((a, b) => b.created_at.localeCompare(a.created_at));
        const lastEntry = activeEntries[0];

        if (isMounted && !userSelectedRef.current) {
          if (lastEntry?.category_id) {
            setCategoryId(lastEntry.category_id);
          } else {
            // Pick first default category for this scope
            const cats = await db.categories
              .where("scope")
              .equals(scope)
              .and((c) => c.deleted_at === null && !c.is_hidden)
              .toArray();
            cats.sort((a, b) => a.sort_order - b.sort_order);
            const firstCat = cats[0];

            if (isMounted && !userSelectedRef.current && firstCat?.id) {
              setCategoryId(firstCat.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load last category", err);
      }
    }

    loadLastCategory();
    return () => {
      isMounted = false;
    };
  }, [kind, scope]);

  const isOther = categoryId === OTHER_CATEGORY_VALUE;
  const hasValidCategory = isOther ? customCategoryName.trim().length > 0 : categoryId.length > 0;
  const isValidAmount = amountMinor > 0 && amountMinor <= 99999999999999;
  const isValidDate = date.length === 10;
  const canSave = isValidAmount && hasValidCategory && isValidDate && !isSubmitting;

  const handleCategoryChange = (selectedId: string, isOtherChoice: boolean) => {
    userSelectedRef.current = true;
    setCategoryId(selectedId);
    if (!isOtherChoice) {
      setCustomCategoryName("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalCategoryId = categoryId;

      // Create custom category if "Other" was selected
      if (isOther) {
        const trimmedName = customCategoryName.trim();
        const createdCat = await createCategory({
          scope,
          name: trimmedName,
          slug: toSlug(trimmedName),
          is_default: false,
        });
        finalCategoryId = createdCat.id;
      }

      // Validate with Zod schema
      const basePayload = {
        amount_minor: amountMinor,
        category_id: finalCategoryId,
        occurred_on: date,
        description: description.trim() || null,
      };

      if (action === "income") {
        incomeFormSchema.parse({
          ...basePayload,
          counterparty: counterparty.trim() || null,
        });
      } else if (action === "expense") {
        expenseFormSchema.parse(basePayload);
      } else if (action === "giving") {
        givingFormSchema.parse({
          ...basePayload,
          counterparty: counterparty.trim() || null,
        });
      }

      // TODO(prompt-14): wire recurring rule storage for repeats value
      // repeats state: "No" | "Weekly" | "Monthly"

      const newEntry = await createEntry({
        kind,
        category_id: finalCategoryId,
        amount_minor: amountMinor,
        occurred_on: date,
        counterparty: counterparty.trim() || null,
        description: description.trim() || null,
      });

      onClose();

      toast("Saved", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await softDeleteEntry(newEntry.id);
          },
        },
      });
    } catch (err: unknown) {
      console.error("Save entry error:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to save entry. Please check the fields.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionTitle =
    action === "income" ? "Money in" : action === "expense" ? "Money out" : "Giving";

  return (
    <form onSubmit={handleSave} className="flex h-full max-h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-background px-4 py-3 sm:px-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{actionTitle}</h2>
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

      {/* Scrollable middle area (all fields directly shown, no More Details) */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6">
        {errorMessage && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* 1. Amount (Required) */}
        <AmountField
          label="Amount"
          value={amountMinor}
          onChange={(val) => setAmountMinor(val)}
          currency={currency}
          required
          autoFocus
        />

        {/* 2. Category (Required) */}
        <CategoryPicker
          scope={scope}
          value={categoryId}
          customName={customCategoryName}
          onChange={handleCategoryChange}
          onCustomNameChange={setCustomCategoryName}
          required
        />

        {/* 3. Date (Required) */}
        <DateField
          label="Date"
          value={date}
          onChange={(d) => setDate(d)}
          required
        />

        {/* 4. Optional Counterparty (Source for Money in; Recipient for Giving) */}
        {action === "income" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="source-input" className="text-sm font-medium text-foreground">
              Source (optional)
            </label>
            <Input
              id="source-input"
              type="text"
              placeholder="e.g. Employer, client, brand"
              maxLength={80}
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        )}

        {action === "giving" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recipient-input" className="text-sm font-medium text-foreground">
              Recipient (optional)
            </label>
            <Input
              id="recipient-input"
              type="text"
              placeholder="Person, church, mosque or organisation"
              maxLength={80}
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        )}

        {/* 5. Repeats (optional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="repeats-select" className="text-sm font-medium text-foreground">
            Repeats (optional)
          </label>
          <select
            id="repeats-select"
            value={repeats}
            onChange={(e) => setRepeats(e.target.value as "No" | "Weekly" | "Monthly")}
            className="flex h-11 w-full appearance-none items-center justify-between rounded-xl border border-input bg-background/50 px-3.5 py-2 text-base text-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
          >
            <option value="No">No</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        {/* 6. Description (optional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description-input" className="text-sm font-medium text-foreground">
            Description (optional)
          </label>
          <textarea
            id="description-input"
            rows={3}
            placeholder="Optional notes or details"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex w-full rounded-xl border border-input bg-background/50 px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
          />
          <span className="self-end text-[11px] text-muted-foreground">
            {description.length}/500
          </span>
        </div>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/50 bg-background/95 px-4 py-3.5 backdrop-blur-xs pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
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
          className="rounded-xl px-6 font-semibold"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Money I lent Entry Form (PRD 4.4)
// ============================================================================
function LentEntryForm({
  onClose,
  currency,
}: {
  onClose: () => void;
  currency: string;
}) {
  const scope: CategoryScope = "lent";
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [borrower, setBorrower] = React.useState<string>("");
  const [amountMinor, setAmountMinor] = React.useState<number>(0);
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [customCategoryName, setCustomCategoryName] = React.useState<string>("");
  const [dateLent, setDateLent] = React.useState<string>(today);
  const [expectedBackBy, setExpectedBackBy] = React.useState<string>(today);
  const [plan, setPlan] = React.useState<RepeatPlan>("one_payment");
  const [interestType, setInterestType] = React.useState<InterestKind>("none");
  const [interestInputText, setInterestInputText] = React.useState<string>("");
  const [remind, setRemind] = React.useState<boolean>(true);
  const [description, setDescription] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const userSelectedCategoryRef = React.useRef(false);

  // Default category to first default category for lent
  React.useEffect(() => {
    let isMounted = true;
    async function loadLentCategory() {
      try {
        const cats = await db.categories
          .where("scope")
          .equals("lent")
          .and((c) => c.deleted_at === null && !c.is_hidden)
          .toArray();
        cats.sort((a, b) => a.sort_order - b.sort_order);
        const firstCat = cats[0];
        if (isMounted && !userSelectedCategoryRef.current && firstCat?.id) {
          setCategoryId(firstCat.id);
        }
      } catch (err) {
        console.error("Failed to load lent category", err);
      }
    }
    loadLentCategory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute interest value
  const interestValue = React.useMemo(() => {
    if (interestType === "none" || !interestInputText) return 0;
    const num = parseFloat(interestInputText.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) return 0;
    if (interestType === "percent") {
      // Basis points: 5% = 500
      return Math.round(num * 100);
    }
    if (interestType === "flat") {
      // Minor units
      return Math.round(num * 100);
    }
    return 0;
  }, [interestType, interestInputText]);

  const [customInstalmentMinor, setCustomInstalmentMinor] = React.useState<number | null>(null);

  // Compute suggested instalment reactively
  const suggestedInstalmentValue = React.useMemo(() => {
    if (plan === "weekly" || plan === "monthly") {
      if (amountMinor > 0 && expectedBackBy >= dateLent) {
        const total = totalToGetBack(amountMinor, interestType, interestValue);
        const count = instalmentCount(dateLent, expectedBackBy, plan);
        return suggestedInstalment(total, count);
      }
    }
    return 0;
  }, [plan, amountMinor, dateLent, expectedBackBy, interestType, interestValue]);

  const activeInstalmentMinor = customInstalmentMinor ?? suggestedInstalmentValue;

  const isOther = categoryId === OTHER_CATEGORY_VALUE;
  const hasValidCategory = isOther ? customCategoryName.trim().length > 0 : categoryId.length > 0;
  const hasBorrower = borrower.trim().length > 0 && borrower.trim().length <= 80;
  const isValidAmount = amountMinor > 0 && amountMinor <= 99999999999999;
  const isValidDates = dateLent.length === 10 && expectedBackBy.length === 10 && expectedBackBy >= dateLent;
  const canSave = hasBorrower && isValidAmount && hasValidCategory && isValidDates && !isSubmitting;

  const handleCategoryChange = (selectedId: string, isOtherChoice: boolean) => {
    userSelectedCategoryRef.current = true;
    setCategoryId(selectedId);
    if (!isOtherChoice) {
      setCustomCategoryName("");
    }
  };

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
          scope,
          name: trimmedName,
          slug: toSlug(trimmedName),
          is_default: false,
        });
        finalCategoryId = createdCat.id;
      }

      // Validate with Zod schema
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

      const newLoan = await createLoan({
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

      toast("Saved", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await softDeleteLoan(newLoan.id);
          },
        },
      });
    } catch (err: unknown) {
      console.error("Save loan error:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to save loan. Please check the fields.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex h-full max-h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-background px-4 py-3 sm:px-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Money I lent</h2>
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

      {/* Scrollable body with exact PRD 4.4 field order */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6">
        {errorMessage && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* 1. Borrower (Required) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="borrower-input" className="text-sm font-medium text-foreground">
            Borrower <span className="text-destructive">*</span>
          </label>
          <Input
            id="borrower-input"
            type="text"
            placeholder="Who did you lend to?"
            maxLength={80}
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            required
            autoFocus
            className="h-11 rounded-xl"
          />
        </div>

        {/* 2. Amount lent (Required) */}
        <AmountField
          label="Amount lent"
          value={amountMinor}
          onChange={(val) => setAmountMinor(val)}
          currency={currency}
          required
        />

        {/* 3. Category (Required) */}
        <CategoryPicker
          scope={scope}
          value={categoryId}
          customName={customCategoryName}
          onChange={handleCategoryChange}
          onCustomNameChange={setCustomCategoryName}
          required
        />

        {/* 4. Date lent (Required) */}
        <DateField
          label="Date lent"
          value={dateLent}
          onChange={(d) => setDateLent(d)}
          required
        />

        {/* 5. Expected back by (Required) */}
        <DateField
          label="Expected back by"
          value={expectedBackBy}
          onChange={(d) => setExpectedBackBy(d)}
          required
        />
        {expectedBackBy < dateLent && (
          <span className="text-xs text-destructive">
            Expected back by date must be on or after Date lent
          </span>
        )}

        {/* 6. Payback plan (optional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-select" className="text-sm font-medium text-foreground">
            Payback plan (optional)
          </label>
          <select
            id="plan-select"
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

        {/* 7. Instalment amount (optional) */}
        {plan !== "one_payment" && (
          <div className="flex flex-col gap-1.5">
            <AmountField
              label="Instalment amount (optional)"
              value={activeInstalmentMinor}
              onChange={(val) => {
                setCustomInstalmentMinor(val);
              }}
              currency={currency}
            />
          </div>
        )}

        {/* 8. Interest (optional) */}
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

        {/* 9. Remind me (switch, default on) */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Remind me</span>
            <span className="text-xs text-muted-foreground">
              Notify before instalment & final due dates
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={remind}
            onClick={() => setRemind((prev) => !prev)}
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

        {/* 10. Description (optional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lent-description-input" className="text-sm font-medium text-foreground">
            Description (optional)
          </label>
          <textarea
            id="lent-description-input"
            rows={3}
            placeholder="Optional notes or details"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex w-full rounded-xl border border-input bg-background/50 px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
          />
          <span className="self-end text-[11px] text-muted-foreground">
            {description.length}/500
          </span>
        </div>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/50 bg-background/95 px-4 py-3.5 backdrop-blur-xs pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
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
          className="rounded-xl px-6 font-semibold"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}
