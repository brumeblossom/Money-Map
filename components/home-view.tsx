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
import { RecurringBanners } from "@/components/recurring-banners";
import { useEntries, useLoans, useLoanPayments, useProfile } from "@/lib/repo/hooks";
import { seedDefaultCategories } from "@/lib/repo/seed";
import { claimGuestData, updateProfile, createProfile } from "@/lib/repo";
import { db, type RecurringRuleRow } from "@/lib/db/dexie";
import { createClient } from "@/lib/supabase/client";
import { extractFirstName } from "@/lib/auth/user-name";
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

  const profile = useProfile();
  const effectiveCurrency = profile?.currency || currency || "NGN";

  const currentAction = activeAction;

  const [guestEntriesCount, setGuestEntriesCount] = React.useState<number | null>(null);
  const [currentAuthUserId, setCurrentAuthUserId] = React.useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = React.useState(false);
  const [namePromptValue, setNamePromptValue] = React.useState("");
  const [namePromptError, setNamePromptError] = React.useState<string | null>(null);
  const [isSavingName, setIsSavingName] = React.useState(false);

  // Run seed once on mount (idempotent)
  React.useEffect(() => {
    seedDefaultCategories().catch((err) => {
      console.error("Failed to seed default categories", err);
    });
  }, []);

  // Check name and guest entries on mount
  React.useEffect(() => {
    async function initSession() {
      try {
        // Auth user check
        const supabase = createClient();
        let userId: string | null = null;
        let authUser: { id: string; user_metadata?: Record<string, unknown> } | null = null;

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          userId = sessionData.session.user.id;
          authUser = sessionData.session.user;
        }

        if (!userId && typeof document !== "undefined") {
          const match = document.cookie.match(/moneymap_mock_user=([^;]+)/);
          if (match) {
            userId = match[1];
            authUser = { id: userId };
          }
        }

        setCurrentAuthUserId(userId);

        if (userId) {
          if (typeof document !== "undefined") {
            document.cookie =
              "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          }

          // Check display_name: if empty, extract name from user_metadata or pending first name
          const existingProfile = await db.profiles.get(userId);
          const currentName = existingProfile?.display_name?.trim();
          if (!currentName) {
            const fallbackPending = typeof window !== "undefined" ? sessionStorage.getItem("moneymap_pending_first_name") : null;
            const extracted = extractFirstName(authUser?.user_metadata, fallbackPending);
            if (extracted) {
              if (existingProfile) {
                await updateProfile(userId, { display_name: extracted });
              } else {
                await createProfile({ user_id: userId, display_name: extracted, currency: "NGN" });
              }
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("moneymap_pending_first_name");
              }
            } else {
              setShowNamePrompt(true);
            }
          }

          // Guest entries check: do NOT merge silently!
          const unassignedEntries = await db.entries.filter((e) => !e.user_id || e.user_id === "").count();
          if (unassignedEntries > 0) {
            const dismissed = typeof window !== "undefined" && sessionStorage.getItem("moneymap_guest_prompt_dismissed") === "true";
            if (!dismissed) {
              setGuestEntriesCount(unassignedEntries);
            }
          }
        }
      } catch (e) {
        console.error("Failed to init session on Home", e);
      }
    }

    initSession();
  }, [router]);

  const handleClaimGuestEntries = async () => {
    if (!currentAuthUserId) return;
    try {
      const claimed = await claimGuestData(currentAuthUserId);
      setGuestEntriesCount(null);
      if (claimed > 0) {
        toast(`Your ${claimed} entries are now saved to your account`);
      }
    } catch (e) {
      console.error("Failed to claim guest entries", e);
    }
  };

  const handleDismissGuestEntries = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("moneymap_guest_prompt_dismissed", "true");
    }
    setGuestEntriesCount(null);
  };

  const handleSaveNamePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setNamePromptError(null);
    const trimmed = namePromptValue.trim();
    if (!trimmed || trimmed.length > 30) {
      setNamePromptError("Please enter a name up to 30 characters");
      return;
    }
    if (!currentAuthUserId) return;

    setIsSavingName(true);
    try {
      const existing = await db.profiles.get(currentAuthUserId);
      if (existing) {
        await updateProfile(currentAuthUserId, { display_name: trimmed });
      } else {
        await createProfile({ user_id: currentAuthUserId, display_name: trimmed, currency: "NGN" });
      }
      setShowNamePrompt(false);
      toast("Name saved");
    } catch (err) {
      console.error("Failed to save name", err);
      setNamePromptError("Failed to save name");
    } finally {
      setIsSavingName(false);
    }
  };

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

  const [editingRecurringRule, setEditingRecurringRule] =
    React.useState<RecurringRuleRow | null>(null);

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

      {/* Guest entries protection prompt (Prompt 15b Item 6) */}
      {guestEntriesCount !== null && guestEntriesCount > 0 && (
        <div
          data-testid="claim-guest-card"
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-xs space-y-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              This device has {guestEntriesCount} {guestEntriesCount === 1 ? "entry" : "entries"} saved without an account.
            </h3>
            <p className="text-xs text-muted-foreground">
              Add them to your account?
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClaimGuestEntries}
              data-testid="claim-guest-add-btn"
              className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer"
            >
              Add them
            </button>
            <button
              type="button"
              onClick={handleDismissGuestEntries}
              data-testid="claim-guest-keep-separate-btn"
              className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Not mine, keep separate
            </button>
          </div>
        </div>
      )}

      {/* One-time name prompt card: "What should we call you?" (Prompt 15b Item 3) */}
      {showNamePrompt && (
        <form
          onSubmit={handleSaveNamePrompt}
          data-testid="home-name-prompt-card"
          className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">What should we call you?</h3>
            <p className="text-xs text-muted-foreground">
              Add your first name to personalize your account.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              data-testid="home-name-prompt-input"
              value={namePromptValue}
              onChange={(e) => {
                setNamePromptValue(e.target.value);
                if (namePromptError) setNamePromptError(null);
              }}
              placeholder="Your name"
              maxLength={30}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSavingName}
              data-testid="home-name-prompt-save"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSavingName ? "Saving..." : "Save"}
            </button>
          </div>
          {namePromptError && (
            <p className="text-xs text-destructive">{namePromptError}</p>
          )}
        </form>
      )}

      {/* Recurring reminders banner cards (US-5.1 Prompt 14) */}
      <RecurringBanners
        today={today}
        currency={effectiveCurrency}
        onEditRule={(rule) => setEditingRecurringRule(rule)}
      />

      {/* Header section */}
      <div className="space-y-1">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
          {profile?.display_name?.trim()
            ? `Welcome back, ${profile.display_name.trim()}`
            : !currentAuthUserId
              ? "Welcome, guest"
              : "Welcome back"}
        </p>
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
              {formatMoney(totals.moneyIn, effectiveCurrency)}
            </span>
            <span data-testid="month-strip-money-in" className="sr-only">
              {formatMoney(totals.moneyIn, effectiveCurrency)}
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
              {formatMoney(totals.moneyOut, effectiveCurrency)}
            </span>
            <span data-testid="month-strip-money-out" className="sr-only">
              {formatMoney(totals.moneyOut, effectiveCurrency)}
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
              {formatMoney(totals.leftOver, effectiveCurrency)}
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
          currency={effectiveCurrency}
          icon={ArrowDownLeft}
          href="/new/income"
          recordsHref="/records?tab=income"
          onClick={() => handleActionClick("income")}
        />

        <ActionCard
          data-testid="action-card-expense"
          label="Expenses"
          amountMinor={totals.expenses}
          currency={effectiveCurrency}
          icon={ArrowUpRight}
          href="/new/expense"
          recordsHref="/records?tab=expenses"
          onClick={() => handleActionClick("expense")}
        />

        <ActionCard
          data-testid="action-card-giving"
          label="Giving"
          amountMinor={totals.giving}
          currency={effectiveCurrency}
          icon={Heart}
          href="/new/giving"
          recordsHref="/records?tab=giving"
          onClick={() => handleActionClick("giving")}
        />

        <ActionCard
          data-testid="action-card-lent"
          label="Money I lent"
          amountMinor={lentOwed}
          currency={effectiveCurrency}
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
          currency={effectiveCurrency}
        />
      )}

      {/* Entry Modal when editing a due recurring rule ("Edit first") */}
      {editingRecurringRule && (
        <EntryModal
          action={editingRecurringRule.kind}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingRecurringRule(null);
          }}
          currency={effectiveCurrency}
          initialValues={{
            amount_minor: editingRecurringRule.amount_minor,
            category_id: editingRecurringRule.category_id,
            counterparty: editingRecurringRule.counterparty,
            description: editingRecurringRule.description,
            occurred_on: today,
            repeats: "No",
          }}
          recurringRuleIdToAdvance={editingRecurringRule.id}
        />
      )}
    </div>
  );
}
