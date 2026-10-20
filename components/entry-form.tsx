"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "cn";
import { db, type CategoryScope, type EntryKind } from "@/lib/db/dexie";
import { createEntry, createCategory, softDeleteEntry, listEntries } from "@/lib/repo";
import { toSlug } from "@/lib/repo/seed";
import { incomeFormSchema, expenseFormSchema, givingFormSchema } from "@/lib/schemas";
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

  const isValidAction = action === "income" || action === "expense" || action === "giving";

  if (!isValidAction) {
    const actionLabels: Record<string, string> = {
      lent: "Money I lent",
    };
    const title = actionLabels[action] || action;

    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
        <Button onClick={handleClose} className="mt-6 rounded-xl">
          Close
        </Button>
      </div>
    );
  }

  return (
    <ActiveEntryForm
      action={action as "income" | "expense" | "giving"}
      onClose={handleClose}
      currency={currency}
    />
  );
}

function ActiveEntryForm({
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

  const [showMoreDetails, setShowMoreDetails] = React.useState<boolean>(false);
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
    <form onSubmit={handleSave} className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{actionTitle}</h2>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Required fields on top */}
      <div className="flex flex-col gap-4">
        {/* Amount */}
        <AmountField
          label="Amount"
          value={amountMinor}
          onChange={(val) => setAmountMinor(val)}
          currency={currency}
          required
          autoFocus
        />

        {/* Category */}
        <CategoryPicker
          scope={scope}
          value={categoryId}
          customName={customCategoryName}
          onChange={handleCategoryChange}
          onCustomNameChange={setCustomCategoryName}
          required
        />

        {/* Date */}
        <DateField
          label="Date"
          value={date}
          onChange={(d) => setDate(d)}
          required
        />
      </div>

      {/* Optional fields under collapsed "More details" */}
      <div className="flex flex-col border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={() => setShowMoreDetails((prev) => !prev)}
          className="flex items-center gap-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
          aria-expanded={showMoreDetails}
        >
          <span>More details</span>
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", showMoreDetails && "rotate-180")}
          />
        </button>

        {showMoreDetails && (
          <div className="mt-3 flex flex-col gap-4 animate-in fade-in-50 slide-in-from-top-2">
            {/* Counterparty for income (Source) and giving (Given to) */}
            {action === "income" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="source-input" className="text-sm font-medium text-foreground">
                  Source
                </label>
                <Input
                  id="source-input"
                  type="text"
                  placeholder="e.g. Employer, client, brand"
                  maxLength={80}
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            {action === "giving" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="given-to-input" className="text-sm font-medium text-foreground">
                  Given to
                </label>
                <Input
                  id="given-to-input"
                  type="text"
                  placeholder="e.g. Person, church, mosque or organisation"
                  maxLength={80}
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Repeats (visible but stores nothing yet per prompt) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeats-select" className="text-sm font-medium text-foreground">
                Repeats
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

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description-input" className="text-sm font-medium text-foreground">
                Description
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
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex items-center justify-end gap-3 pt-2">
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
