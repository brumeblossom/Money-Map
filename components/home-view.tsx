"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
  HandCoins,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ActionCard } from "@/components/action-card";
import { EntryModal } from "@/components/entry-modal";
import { GuestBanner } from "@/components/guest-banner";
import { useEntries, useLoans, useLoanPayments } from "@/lib/repo/hooks";
import { seedDefaultCategories } from "@/lib/repo/seed";
import { claimGuestData } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getMonthPeriod, periodTotals, owedToMe } from "@/lib/calc";
import { formatMoney, formatMonthYear } from "@/lib/format";

function getPrevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const prevDate = new Date(Date.UTC(y, m - 2, 1));
  const year = prevDate.getUTCFullYear();
  const month = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getNextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const nextDate = new Date(Date.UTC(y, m, 1));
  const year = nextDate.getUTCFullYear();
  const month = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface HomeViewProps {
  activeAction?: string;
  currency?: string;
}

export function HomeView({ activeAction, currency = "NGN" }: HomeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams?.get("month");

  const currentAction = activeAction;

  // Run seed once on mount (idempotent)
  React.useEffect(() => {
    seedDefaultCategories().catch((err) => {
      console.error("Failed to seed default categories", err);
    });
  }, []);

  // Claim guest data if signed in
  React.useEffect(() => {
    async function syncGuestSession() {
      try {
        const supabase = createClient();
        let userId: string | null = null;
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id ?? null;

        if (!userId && typeof document !== "undefined") {
          const match = document.cookie.match(/moneymap_mock_user=([^;]+)/);
          if (match) userId = match[1];
        }

        if (userId) {
          if (typeof document !== "undefined") {
            document.cookie =
              "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          }

          const claimed = await claimGuestData(userId);
          if (claimed > 0) {
            toast(`Your ${claimed} entries are now saved to your account`);
          }
        }
      } catch (e) {
        console.error("Failed to sync guest session", e);
      }
    }

    syncGuestSession();
  }, []);

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = React.useMemo(() => today.slice(0, 7), [today]);

  const [overrideMonth, setOverrideMonth] = React.useState<string | null>(null);
  const [prevMonthParam, setPrevMonthParam] = React.useState(monthParam);

  if (monthParam !== prevMonthParam) {
    setPrevMonthParam(monthParam);
    setOverrideMonth(null);
  }

  const selectedMonth = overrideMonth ?? monthParam ?? currentMonthStr;

  const entries = useEntries();
  const loans = useLoans();
  const loanPayments = useLoanPayments();

  // Period based on selectedMonth
  const selectedPeriod = React.useMemo(() => {
    return getMonthPeriod(selectedMonth);
  }, [selectedMonth]);

  const totals = React.useMemo(() => {
    return periodTotals(entries ?? [], selectedPeriod);
  }, [entries, selectedPeriod]);

  // Money I lent always shows total balance still owed (not per month)
  const lentOwed = React.useMemo(() => {
    return owedToMe(loans ?? [], loanPayments ?? []);
  }, [loans, loanPayments]);

  const [overrideClosed, setOverrideClosed] = React.useState(false);
  const [prevActiveAction, setPrevActiveAction] = React.useState(activeAction);

  if (activeAction !== prevActiveAction) {
    setPrevActiveAction(activeAction);
    setOverrideClosed(false);
  }

  const isModalOpen = !overrideClosed && !!activeAction;

  const handleActionClick = (actionKey: string) => {
    setOverrideClosed(false);
    router.push(`/new/${actionKey}`);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setOverrideClosed(true);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/new/")) {
        window.history.replaceState(null, "", "/");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <GuestBanner />

      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          What are we recording today?
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Tap a card to add an entry
        </p>
      </div>

      {/* Month strip with month switcher (Income, Expenses, Left over) */}
      <div data-testid="this-month-strip" className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
        {/* Month Switcher Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOverrideMonth(getPrevMonth(selectedMonth))}
            aria-label="Previous month"
            data-testid="month-switcher-prev"
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setOverrideMonth(currentMonthStr)}
            title="Return to current month"
            data-testid="month-switcher-current"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer"
          >
            {formatMonthYear(selectedMonth)}
          </button>

          <button
            type="button"
            onClick={() => setOverrideMonth(getNextMonth(selectedMonth))}
            disabled={selectedMonth >= currentMonthStr}
            aria-label="Next month"
            data-testid="month-switcher-next"
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
          <Link
            href="/records?tab=income"
            className="px-2 first:pl-0 block hover:opacity-80 transition-opacity"
            title="View Income records"
          >
            <span className="block text-xs font-medium text-muted-foreground">
              Income
            </span>
            <span
              data-testid="month-strip-income"
              className="mt-0.5 block text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-base tabular-nums"
            >
              {formatMoney(totals.moneyIn, currency)}
            </span>
            <span data-testid="month-strip-money-in" className="sr-only">
              {formatMoney(totals.moneyIn, currency)}
            </span>
          </Link>

          <Link
            href="/records?tab=expenses"
            className="px-2 block hover:opacity-80 transition-opacity"
            title="View Expenses records"
          >
            <span className="block text-xs font-medium text-muted-foreground">
              Expenses
            </span>
            <span
              data-testid="month-strip-expenses"
              className="mt-0.5 block text-sm font-bold tracking-tight text-rose-600 dark:text-rose-400 sm:text-base tabular-nums"
            >
              {formatMoney(totals.moneyOut, currency)}
            </span>
            <span data-testid="month-strip-money-out" className="sr-only">
              {formatMoney(totals.moneyOut, currency)}
            </span>
          </Link>

          <div className="px-2 last:pr-0">
            <span className="block text-xs font-medium text-muted-foreground">
              Left over
            </span>
            <span
              data-testid="month-strip-left-over"
              className="mt-0.5 block text-sm font-bold tracking-tight text-foreground sm:text-base tabular-nums"
            >
              {formatMoney(totals.leftOver, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Four Action Cards (2x2 on phones and tablets < 1024px, 4 in a row from 1024px) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 items-stretch">
        <ActionCard
          data-testid="action-card-income"
          label="Income"
          amountMinor={totals.moneyIn}
          currency={currency}
          icon={ArrowDownLeft}
          href="/new/income"
          recordsHref="/records?tab=income"
          onClick={() => handleActionClick("income")}
        />

        <ActionCard
          data-testid="action-card-expense"
          label="Expenses"
          amountMinor={totals.expenses}
          currency={currency}
          icon={ArrowUpRight}
          href="/new/expense"
          recordsHref="/records?tab=expenses"
          onClick={() => handleActionClick("expense")}
        />

        <ActionCard
          data-testid="action-card-giving"
          label="Giving"
          amountMinor={totals.giving}
          currency={currency}
          icon={Heart}
          href="/new/giving"
          recordsHref="/records?tab=giving"
          onClick={() => handleActionClick("giving")}
        />

        <ActionCard
          data-testid="action-card-lent"
          label="Money I lent"
          amountMinor={lentOwed}
          currency={currency}
          icon={HandCoins}
          href="/new/lent"
          recordsHref="/records?tab=lent"
          onClick={() => handleActionClick("lent")}
          badge="Owed"
        />
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
