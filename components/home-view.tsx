"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Heart, HandCoins } from "lucide-react";
import { ActionCard } from "@/components/action-card";
import { EntryModal } from "@/components/entry-modal";
import { useEntries, useLoans, useLoanPayments } from "@/lib/repo/hooks";
import { seedDefaultCategories } from "@/lib/repo/seed";
import { getPeriodPreset, periodTotals, owedToMe } from "@/lib/calc";
import { formatMoney } from "@/lib/format";

export interface HomeViewProps {
  activeAction?: string;
  currency?: string;
}

export function HomeView({ activeAction: initialAction, currency = "NGN" }: HomeViewProps) {
  const router = useRouter();
  const [overrideAction, setOverrideAction] = React.useState<string | null | undefined>(undefined);
  const [prevInitial, setPrevInitial] = React.useState(initialAction);

  if (initialAction !== prevInitial) {
    setPrevInitial(initialAction);
    setOverrideAction(undefined);
  }

  const currentAction =
    overrideAction !== undefined ? (overrideAction ?? undefined) : initialAction;

  // Run seed once on mount (idempotent)
  React.useEffect(() => {
    seedDefaultCategories().catch((err) => {
      console.error("Failed to seed default categories", err);
    });
  }, []);

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const entries = useEntries();
  const loans = useLoans();
  const loanPayments = useLoanPayments();

  // Calculate totals for "thisMonth"
  const thisMonthPreset = React.useMemo(() => {
    return getPeriodPreset("thisMonth", today);
  }, [today]);

  const totals = React.useMemo(() => {
    return periodTotals(entries ?? [], thisMonthPreset);
  }, [entries, thisMonthPreset]);

  const lentOwed = React.useMemo(() => {
    return owedToMe(loans ?? [], loanPayments ?? []);
  }, [loans, loanPayments]);

  const isModalOpen = !!currentAction;

  const handleActionClick = (actionKey: string) => {
    setOverrideAction(actionKey);
    window.history.pushState(null, "", `/new/${actionKey}`);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setOverrideAction(null);
      if (initialAction) {
        router.push("/");
      } else {
        window.history.pushState(null, "", "/");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          What are we recording today?
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Tap a card to add an entry
        </p>
      </div>

      {/* This-month strip (In, Out, Left over) */}
      <div data-testid="this-month-strip" className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This month
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
          <div className="px-2 first:pl-0">
            <span className="block text-xs font-medium text-muted-foreground">
              Money in
            </span>
            <span
              data-testid="month-strip-money-in"
              className="mt-0.5 block text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-base"
            >
              {formatMoney(totals.moneyIn, currency)}
            </span>
          </div>

          <div className="px-2">
            <span className="block text-xs font-medium text-muted-foreground">
              Money out
            </span>
            <span
              data-testid="month-strip-money-out"
              className="mt-0.5 block text-sm font-bold tracking-tight text-rose-600 dark:text-rose-400 sm:text-base"
            >
              {formatMoney(totals.moneyOut, currency)}
            </span>
          </div>

          <div className="px-2 last:pr-0">
            <span className="block text-xs font-medium text-muted-foreground">
              Left over
            </span>
            <span
              data-testid="month-strip-left-over"
              className="mt-0.5 block text-sm font-bold tracking-tight text-foreground sm:text-base"
            >
              {formatMoney(totals.leftOver, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Four Action Cards (2x2 on phones, 4 in a row on desktop) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* 1. Money in */}
        <div data-testid="action-card-income">
          <ActionCard
            label="Money in"
            amountMinor={totals.moneyIn}
            currency={currency}
            icon={ArrowDownLeft}
            href="/new/income"
            onClick={() => handleActionClick("income")}
          />
        </div>

        {/* 2. Money out */}
        <div data-testid="action-card-expense">
          <ActionCard
            label="Money out"
            amountMinor={totals.expenses}
            currency={currency}
            icon={ArrowUpRight}
            href="/new/expense"
            onClick={() => handleActionClick("expense")}
          />
        </div>

        {/* 3. Giving */}
        <div data-testid="action-card-giving">
          <ActionCard
            label="Giving"
            amountMinor={totals.giving}
            currency={currency}
            icon={Heart}
            href="/new/giving"
            onClick={() => handleActionClick("giving")}
          />
        </div>

        {/* 4. Money I lent */}
        <div data-testid="action-card-lent">
          <ActionCard
            label="Money I lent"
            amountMinor={lentOwed}
            currency={currency}
            icon={HandCoins}
            href="/new/lent"
            onClick={() => handleActionClick("lent")}
            badge="Owed"
          />
        </div>
      </div>

      {/* Entry Modal / Drawer when activeAction is present */}
      {currentAction && (
        <EntryModal
          action={currentAction}
          open={isModalOpen}
          onOpenChange={handleModalClose}
          currency={currency}
        />
      )}
    </div>
  );
}
