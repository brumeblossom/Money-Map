"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  X,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Heart,
  Plus,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { db, type EntryRow, type CategoryRow } from "@/lib/db/dexie";
import { softDeleteEntry, restoreEntry } from "@/lib/repo";
import { useLoans, useLoanPayments } from "@/lib/repo/hooks";
import {
  signedAmount,
  getPeriodPreset,
  type PeriodPreset,
  totalToGetBack,
  receivedSoFar,
  balanceLeft,
  owedToMe,
} from "@/lib/calc";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LentListView } from "@/components/lent-list-view";
import { EntryModal } from "@/components/entry-modal";
import { cn } from "@/lib/utils";

export type RecordsTab = "income" | "expenses" | "giving" | "lent";

export const TAB_CONFIG: Record<
  RecordsTab,
  {
    action: "income" | "expense" | "giving" | "lent";
    desktopLabel: string;
    fabLabel: string;
    summaryLabel: string;
  }
> = {
  income: {
    action: "income",
    desktopLabel: "Add income",
    fabLabel: "Add income",
    summaryLabel: "TOTAL INCOME",
  },
  expenses: {
    action: "expense",
    desktopLabel: "Add expense",
    fabLabel: "Add expense",
    summaryLabel: "TOTAL EXPENSES",
  },
  giving: {
    action: "giving",
    desktopLabel: "Add giving",
    fabLabel: "Add giving",
    summaryLabel: "TOTAL GIVING",
  },
  lent: {
    action: "lent",
    desktopLabel: "Lend money",
    fabLabel: "Lend money",
    summaryLabel: "OWED TO YOU",
  },
};

interface VirtualHeaderItem {
  type: "header";
  key: string;
  date: string;
  displayDate: string;
  netTotalMinor: number;
}

interface VirtualEntryItem {
  type: "entry";
  key: string;
  entry: EntryRow;
  categoryName: string;
}

type VirtualListItem = VirtualHeaderItem | VirtualEntryItem;

function parseTab(raw: string | null): RecordsTab {
  if (!raw) return "income";
  const lower = raw.toLowerCase();
  if (lower === "expense" || lower === "expenses") return "expenses";
  if (lower === "giving") return "giving";
  if (lower === "lent") return "lent";
  return "income";
}

function parsePeriod(raw: string | null): PeriodPreset {
  if (!raw) return "thisMonth";
  if (raw === "3m" || raw === "last3Months") return "last3Months";
  if (raw === "6m" || raw === "last6Months") return "last6Months";
  if (raw === "12m" || raw === "last12Months") return "last12Months";
  if (raw === "custom") return "custom";
  if (raw === "thisMonth") return "thisMonth";
  return "thisMonth";
}

export function RecordsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get("tab") ?? null;
  const periodParam = searchParams?.get("period") ?? null;
  const searchParam = searchParams?.get("search") ?? "";
  const catParam = searchParams?.get("category") ?? "all";

  // Tab state (Income | Expenses | Giving | Lent)
  const [activeTab, setActiveTab] = React.useState<RecordsTab>(() => {
    if (tabParam) return parseTab(tabParam);
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("moneymap_records_tab");
      if (stored) return parseTab(stored);
    }
    return "income";
  });

  // Sync tab from URL if it changes externally
  React.useEffect(() => {
    if (tabParam) {
      const parsed = parseTab(tabParam);
      setActiveTab(parsed);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("moneymap_records_tab", parsed);
      }
    }
  }, [tabParam]);

  // Filters state
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>(catParam);
  const [periodPreset, setPeriodPreset] = React.useState<PeriodPreset>(() => parsePeriod(periodParam));
  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [searchQuery, setSearchQuery] = React.useState<string>(searchParam);

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState<boolean>(false);

  // Swipe-to-reveal state for mobile rows
  const [swipedEntryId, setSwipedEntryId] = React.useState<string | null>(null);

  // Delete confirmation modal state
  const [entryToDelete, setEntryToDelete] = React.useState<EntryRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Live queries from Dexie
  const entries = useLiveQuery(async () => {
    const list = await db.entries.toArray();
    return list.filter((e) => e.deleted_at === null);
  }, []);

  const categories = useLiveQuery(async () => {
    const list = await db.categories.toArray();
    return list.filter((c) => !c.deleted_at);
  }, []);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const currency = profile?.currency || "NGN";

  // Category map for rapid lookup
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, CategoryRow>();
    if (categories) {
      for (const cat of categories) {
        map.set(cat.id, cat);
      }
    }
    return map;
  }, [categories]);

  // Today reference
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Update URL helper
  const updateUrl = React.useCallback(
    (tab: RecordsTab, period: PeriodPreset, search: string, cat: string, pushHistory = false) => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (period !== "thisMonth") params.set("period", period);
      if (search.trim()) params.set("search", search.trim());
      if (cat !== "all") params.set("category", cat);
      const url = `/records?${params.toString()}`;
      if (pushHistory) {
        router.push(url);
      } else {
        router.replace(url);
      }
    },
    [router],
  );

  const handleTabChange = (newTab: RecordsTab) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("moneymap_records_tab", newTab);
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    updateUrl(newTab, periodPreset, searchQuery, selectedCategoryId, true);
  };

  const handlePeriodChange = (newPeriod: PeriodPreset) => {
    setPeriodPreset(newPeriod);
    updateUrl(activeTab, newPeriod, searchQuery, selectedCategoryId, false);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    updateUrl(activeTab, periodPreset, query, selectedCategoryId, false);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    updateUrl(activeTab, periodPreset, searchQuery, catId, false);
  };

  // Add Entry/Loan Modal state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addModalAction, setAddModalAction] = React.useState<"income" | "expense" | "giving" | "lent">("income");

  const handleOpenAdd = (tab: RecordsTab) => {
    setAddModalAction(TAB_CONFIG[tab].action);
    setIsAddModalOpen(true);
  };

  // Filter categories matching current tab scope
  const relevantCategories = React.useMemo(() => {
    if (!categories) return [];
    const visible = categories.filter((c) => !c.is_hidden || c.id === selectedCategoryId);
    if (activeTab === "income") {
      return visible.filter((c) => c.scope === "income");
    }
    if (activeTab === "expenses") {
      return visible.filter((c) => c.scope === "expense");
    }
    if (activeTab === "giving") {
      return visible.filter((c) => c.scope === "giving");
    }
    if (activeTab === "lent") {
      return visible.filter((c) => c.scope === "lent");
    }
    return visible;
  }, [categories, activeTab, selectedCategoryId]);

  // Filter and sort entries based on active tab and filters
  const filteredEntries = React.useMemo(() => {
    if (!entries) return [];

    let result = entries;

    // Filter by tab
    if (activeTab === "income") {
      result = result.filter((e) => e.kind === "income");
    } else if (activeTab === "expenses") {
      result = result.filter((e) => e.kind === "expense");
    } else if (activeTab === "giving") {
      result = result.filter((e) => e.kind === "giving");
    }

    // Filter by category
    if (selectedCategoryId !== "all") {
      result = result.filter((e) => e.category_id === selectedCategoryId);
    }

    // Filter by period
    const range =
      periodPreset === "custom"
        ? customRange
        : getPeriodPreset(periodPreset, today);

    result = result.filter(
      (e) => e.occurred_on >= range.start && e.occurred_on <= range.end,
    );

    // Filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((e) => {
        const desc = (e.description || "").toLowerCase();
        const counterparty = (e.counterparty || "").toLowerCase();
        const catName = (categoryMap.get(e.category_id)?.name || "").toLowerCase();
        return (
          desc.includes(query) ||
          counterparty.includes(query) ||
          catName.includes(query)
        );
      });
    }

    // Sort newest first (occurred_on desc, created_at desc)
    return [...result].sort((a, b) => {
      const dateCmp = b.occurred_on.localeCompare(a.occurred_on);
      if (dateCmp !== 0) return dateCmp;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [
    entries,
    activeTab,
    selectedCategoryId,
    periodPreset,
    customRange,
    searchQuery,
    categoryMap,
    today,
  ]);

  // Total amount minor for current tab & filters
  const currentTabTotalMinor = React.useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + curr.amount_minor, 0);
  }, [filteredEntries]);

  // Loans metrics for Lent tab
  const rawLoans = useLoans();
  const rawPayments = useLoanPayments();
  const loans = React.useMemo(() => rawLoans ?? [], [rawLoans]);
  const loanPayments = React.useMemo(() => rawPayments ?? [], [rawPayments]);

  const activeLoans = React.useMemo(() => {
    return loans.filter((loan) => {
      if (loan.deleted_at !== null) return false;
      const payments = loanPayments.filter((p) => p.loan_id === loan.id && p.deleted_at === null);
      const total = totalToGetBack(loan.principal_minor, loan.interest_type, loan.interest_value);
      const received = receivedSoFar(payments);
      const balance = balanceLeft(total, received);
      return balance > 0;
    });
  }, [loans, loanPayments]);

  const totalLentOwed = React.useMemo(() => {
    return owedToMe(loans, loanPayments);
  }, [loans, loanPayments]);

  const periodDescription = React.useMemo(() => {
    if (periodPreset === "thisMonth") {
      return formatMonthYear(today.slice(0, 7));
    }
    if (periodPreset === "last3Months") return "Last 3 months";
    if (periodPreset === "last6Months") return "Last 6 months";
    if (periodPreset === "last12Months") return "Last 12 months";
    if (periodPreset === "custom") {
      return `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`;
    }
    return formatMonthYear(today.slice(0, 7));
  }, [periodPreset, today, customRange]);

  const summarySubtitle = React.useMemo(() => {
    if (activeTab === "lent") {
      return `${activeLoans.length} active loan${activeLoans.length === 1 ? "" : "s"}`;
    }
    return `${filteredEntries.length} ${filteredEntries.length === 1 ? "entry" : "entries"} · ${periodDescription}`;
  }, [activeTab, activeLoans.length, filteredEntries.length, periodDescription]);

  const summaryAmount = React.useMemo(() => {
    if (activeTab === "lent") {
      return totalLentOwed;
    }
    return currentTabTotalMinor;
  }, [activeTab, totalLentOwed, currentTabTotalMinor]);

  // Flatten filtered entries into daily groups with headers
  const flattenedItems = React.useMemo(() => {
    const items: VirtualListItem[] = [];
    if (filteredEntries.length === 0) return items;

    // Group by occurred_on
    const groups = new Map<string, EntryRow[]>();
    for (const entry of filteredEntries) {
      const day = entry.occurred_on;
      const group = groups.get(day);
      if (group) {
        group.push(entry);
      } else {
        groups.set(day, [entry]);
      }
    }

    for (const [day, dayEntries] of groups.entries()) {
      const netTotalMinor = dayEntries.reduce(
        (acc, curr) => acc + signedAmount(curr),
        0,
      );

      items.push({
        type: "header",
        key: `header-${day}`,
        date: day,
        displayDate: formatDate(day),
        netTotalMinor,
      });

      for (const entry of dayEntries) {
        items.push({
          type: "entry",
          key: `entry-${entry.id}`,
          entry,
          categoryName: categoryMap.get(entry.category_id)?.name || "Uncategorised",
        });
      }
    }

    return items;
  }, [filteredEntries, categoryMap]);

  // Multi-select net total
  const selectedNetTotalMinor = React.useMemo(() => {
    if (selectedIds.size === 0 || !entries) return 0;
    const entryMap = new Map(entries.map((e) => [e.id, e]));
    let sum = 0;
    for (const id of selectedIds) {
      const found = entryMap.get(id);
      if (found) {
        sum += signedAmount(found);
      }
    }
    return sum;
  }, [selectedIds, entries]);

  // Parent scroll container ref for virtualizer
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      return item?.type === "header" ? 38 : 74;
    },
    getItemKey: (index) => flattenedItems[index]?.key ?? index,
    overscan: 5,
  });

  // Toggle single selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setIsSelectionMode(next.size > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
      setIsSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // Soft delete confirmation execution
  const executeDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    const id = entryToDelete.id;
    try {
      await softDeleteEntry(id);
      setEntryToDelete(null);
      setSwipedEntryId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        if (next.size === 0) setIsSelectionMode(false);
        return next;
      });

      toast("Entry deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreEntry(id);
          },
        },
      });
    } catch (err) {
      console.error("Delete failed:", err);
      toast("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatSigned = (minor: number) => {
    if (minor > 0) return `+${formatMoney(minor, currency)}`;
    if (minor < 0) return `-${formatMoney(Math.abs(minor), currency)}`;
    return formatMoney(0, currency);
  };

  return (
    <div className="relative flex flex-col space-y-3 pb-32 sm:pb-36">
      <h1 className="sr-only">Records</h1>
      {/* 1. Tabs at the Top: Income | Expenses | Giving | Lent */}
      {/* Full-width segmented control sticky on mobile under header, fitting 360px */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pt-1 pb-2 backdrop-blur-sm sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="Records actions"
          className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 text-center"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "income"}
            data-testid="records-tab-income"
            onClick={() => handleTabChange("income")}
            className={`rounded-lg py-2 px-1 text-xs font-semibold transition-all sm:text-sm cursor-pointer ${
              activeTab === "income"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "expenses"}
            data-testid="records-tab-expenses"
            onClick={() => handleTabChange("expenses")}
            className={`rounded-lg py-2 px-1 text-xs font-semibold transition-all sm:text-sm cursor-pointer ${
              activeTab === "expenses"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expenses
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "giving"}
            data-testid="records-tab-giving"
            onClick={() => handleTabChange("giving")}
            className={`rounded-lg py-2 px-1 text-xs font-semibold transition-all sm:text-sm cursor-pointer ${
              activeTab === "giving"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Giving
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "lent"}
            data-testid="records-tab-lent"
            onClick={() => handleTabChange("lent")}
            className={`rounded-lg py-2 px-1 text-xs font-semibold transition-all sm:text-sm cursor-pointer ${
              activeTab === "lent"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lent
          </button>
        </div>
      </div>

      {/* 2. Filter Row Under Tabs */}
      {/* Desktop: Search box, Category dropdown, Period dropdown (for entries), Add button at right end */}
      {/* Phones: Category and Period sit side by side under Search box */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={activeTab === "lent" ? "Search borrower, description..." : "Search description, counterparty..."}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-xl pr-9 pl-10 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Category and Period dropdowns */}
          <div className={cn("grid gap-2 lg:flex lg:items-center lg:gap-3", activeTab === "lent" ? "grid-cols-1" : "grid-cols-2")}>
            {/* Category Dropdown */}
            <div className={cn("w-full", activeTab === "lent" ? "lg:w-56" : "lg:w-48")}>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Filter by category"
                data-testid="records-category-select"
                className="h-10 w-full cursor-pointer rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring sm:text-sm"
              >
                <option value="all">All categories</option>
                {relevantCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Dropdown - non-lent tabs */}
            {activeTab !== "lent" && (
              <div className="w-full lg:w-44">
                <select
                  value={periodPreset}
                  onChange={(e) => handlePeriodChange(e.target.value as PeriodPreset)}
                  aria-label="Filter by period"
                  data-testid="records-period-select"
                  className="h-10 w-full cursor-pointer rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring sm:text-sm"
                >
                  <option value="thisMonth">This month</option>
                  <option value="last3Months">Last 3 months</option>
                  <option value="last6Months">Last 6 months</option>
                  <option value="last12Months">Last 12 months</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            )}

            {/* Export Link (Prompt 16 / US-8.1) */}
            <Link
              href="/export"
              data-testid="records-export-link"
              title="Export records as PDF or share link"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <FileDown className="size-3.5" />
              <span>Export</span>
            </Link>
          </div>
        </div>

        {/* Custom from/to date pickers (DD-MM-YYYY) */}
        {activeTab !== "lent" && periodPreset === "custom" && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:w-80 animate-in fade-in-50">
            <DateField
              label="From"
              value={customRange.start}
              onChange={(s) => setCustomRange((prev) => ({ ...prev, start: s }))}
            />
            <DateField
              label="To"
              value={customRange.end}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e }))}
            />
          </div>
        )}
      </div>

      {/* 3. Summary Header Row Styled Like Home Cards */}
      <div
        data-testid="records-summary-card"
        className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-xs"
      >
        <div className="space-y-0.5 sm:space-y-1">
          <span
            data-testid="records-summary-label"
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {TAB_CONFIG[activeTab].summaryLabel}
          </span>
          <div
            data-testid="records-summary-amount"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums"
          >
            {formatMoney(summaryAmount, currency)}
          </div>
          <p
            data-testid="records-footer"
            className="text-xs text-muted-foreground"
          >
            {summarySubtitle}
            <span className="sr-only"> · {formatMoney(summaryAmount, currency)}</span>
          </p>
        </div>

        {/* Single Add button per tab in the summary row with ONE plus icon, no "+" in text */}
        <Button
          type="button"
          onClick={() => handleOpenAdd(activeTab)}
          data-testid="records-summary-add-button"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xs shrink-0 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="size-4 shrink-0" />
          <span>{TAB_CONFIG[activeTab].desktopLabel}</span>
        </Button>
      </div>

      {/* 4. Tab content: Lent or Entries */}
      {activeTab === "lent" ? (
        <div className="pt-2">
          <LentListView
            currency={currency}
            searchQuery={searchQuery}
            categoryId={selectedCategoryId}
            onAddClick={() => handleOpenAdd("lent")}
          />
        </div>
      ) : (
        <>

          {/* 5. Virtualized Entries List */}
          <div
            ref={parentRef}
            data-testid="records-list-container"
            className="h-[calc(100vh-320px)] min-h-[360px] w-full overflow-y-auto rounded-2xl border border-border/60 bg-card p-2 shadow-xs sm:p-3 touch-pan-y"
          >
            {flattenedItems.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-muted-foreground">No entries found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              <div
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const item = flattenedItems[virtualItem.index];
                  if (!item) return null;

                  if (item.type === "header") {
                    return (
                      <div
                        key={item.key}
                        className="absolute top-0 left-0 flex w-full items-center justify-between border-b border-border/40 bg-card/90 px-3 py-1.5 backdrop-blur-xs"
                        style={{
                          transform: `translateY(${virtualItem.start}px)`,
                          height: `${virtualItem.size}px`,
                        }}
                      >
                        <span className="text-xs font-bold text-foreground">
                          {item.displayDate}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {formatSigned(item.netTotalMinor)}
                        </span>
                      </div>
                    );
                  }

                  const entry = item.entry;
                  const isSelected = selectedIds.has(entry.id);
                  const isSwiped = swipedEntryId === entry.id;

                  return (
                    <div
                      key={item.key}
                      className="absolute top-0 left-0 w-full px-1 py-1"
                      style={{
                        transform: `translateY(${virtualItem.start}px)`,
                        height: `${virtualItem.size}px`,
                      }}
                    >
                      <RecordRowItem
                        entry={entry}
                        categoryName={item.categoryName}
                        currency={currency}
                        isSelected={isSelected}
                        isSelectionMode={isSelectionMode}
                        isSwiped={isSwiped}
                        onToggleSelect={() => toggleSelect(entry.id)}
                        onStartSelect={() => {
                          setSelectedIds((prev) => new Set(prev).add(entry.id));
                          setIsSelectionMode(true);
                        }}
                        onSetSwiped={(open) => setSwipedEntryId(open ? entry.id : null)}
                        onEdit={() => router.push(`/records/${entry.id}/edit`)}
                        onDelete={() => setEntryToDelete(entry)}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelect(entry.id);
                          } else {
                            router.push(`/records/${entry.id}`);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Multi-Select Bar */}
      {selectedIds.size > 0 && (
        <div
          data-testid="selection-bar"
          className="fixed bottom-20 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl border border-primary/20 bg-primary px-4 py-3 text-primary-foreground shadow-2xl animate-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              {selectedIds.size} selected, total {formatSigned(selectedNetTotalMinor)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 cursor-pointer"
            >
              {selectedIds.size === filteredEntries.length ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selection"
              className="rounded-full p-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Delete this entry?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This entry will be removed from your records. You can undo this within 5 seconds.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={executeDelete}
                disabled={isDeleting}
                className="rounded-xl"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phones: round floating button at bottom right, above bottom nav, never covers last row */}
      <button
        type="button"
        onClick={() => handleOpenAdd(activeTab)}
        data-testid="records-fab-add-button"
        aria-label={TAB_CONFIG[activeTab].desktopLabel}
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <Plus className="size-6" />
        <span className="sr-only">{TAB_CONFIG[activeTab].desktopLabel}</span>
      </button>

      {/* Entry Modal for adding entries or loans */}
      <EntryModal
        action={addModalAction}
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        currency={currency}
      />
    </div>
  );
}

// ============================================================================
// Record Row Item with Swipe-Left (mobile), Checkbox & Desktop Edit/Delete Buttons
// ============================================================================
const RecordRowItem = React.memo(function RecordRowItem({
  entry,
  categoryName,
  currency,
  isSelected,
  isSelectionMode,
  isSwiped,
  onToggleSelect,
  onStartSelect,
  onSetSwiped,
  onEdit,
  onDelete,
  onClick,
}: {
  entry: EntryRow;
  categoryName: string;
  currency: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  isSwiped: boolean;
  onToggleSelect: () => void;
  onStartSelect: () => void;
  onSetSwiped: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const isIncome = entry.kind === "income";
  const isExpense = entry.kind === "expense";
  const isGiving = entry.kind === "giving";

  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = React.useRef(false);

  const startLongPress = (x: number, y: number) => {
    touchStartRef.current = { x, y, time: Date.now() };
    didLongPressRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(40);
      }
      onStartSelect();
    }, 500);
  };

  const cancelLongPressOnMove = (x: number, y: number) => {
    if (!touchStartRef.current) return;
    const dx = x - touchStartRef.current.x;
    const dy = y - touchStartRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startLongPress(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startLongPress(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    cancelLongPressOnMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearLongPressTimer();
    if (didLongPressRef.current) return;
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (dx < -50 && Math.abs(dy) < 40) {
      onSetSwiped(true);
    } else if (dx > 40) {
      onSetSwiped(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didLongPressRef.current) {
      e.preventDefault();
      setTimeout(() => {
        didLongPressRef.current = false;
      }, 50);
      return;
    }

    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelect();
    } else {
      onClick();
    }
  };

  const formattedAmount = isIncome
    ? `+${formatMoney(entry.amount_minor, currency)}`
    : `-${formatMoney(entry.amount_minor, currency)}`;

  return (
    <div
      data-testid="record-row"
      data-entry-id={entry.id}
      data-entry-kind={entry.kind}
      className="relative overflow-hidden rounded-xl bg-card transition-all touch-pan-y"
    >
      {/* Revealed Swipe Action Buttons (Mobile gesture) */}
      <div className="absolute inset-y-0 right-0 z-0 flex items-center pr-1 lg:hidden">
        <button
          type="button"
          data-testid="swipe-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
          aria-label="Edit entry"
        >
          <Edit2 className="size-4" />
        </button>
        <button
          type="button"
          data-testid="swipe-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-1 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-opacity hover:opacity-90 cursor-pointer"
          aria-label="Delete entry"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Main Sliding Content */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
        style={{
          transform: isSwiped ? "translateX(-108px)" : "translateX(0px)",
        }}
        className={`relative z-10 flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-transform duration-200 select-none touch-pan-y ${
          isSelected
            ? "border-primary/50 bg-primary/5"
            : "border-border/50 bg-card hover:bg-muted/40"
        }`}
      >
        {/* Checkbox (visible on desktop or when selection mode active) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`mr-3 flex items-center justify-center ${
            isSelectionMode ? "flex" : "hidden sm:flex"
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            data-testid="record-checkbox"
            aria-label={`Select entry ${entry.id}`}
            className="size-4 cursor-pointer rounded border-border text-primary accent-primary focus:ring-primary"
          />
        </div>

        {/* Clickable Link to View Detail */}
        <Link
          href={`/records/${entry.id}`}
          onClick={handleRowClick}
          className="flex min-w-0 flex-1 items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                isIncome
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isExpense
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
              }`}
            >
              {isIncome && <ArrowDownLeft className="size-4" />}
              {isExpense && <ArrowUpRight className="size-4" />}
              {isGiving && <Heart className="size-4" />}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {categoryName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.counterparty || entry.description || formatDate(entry.occurred_on)}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 ml-2">
            <span
              className={`text-sm font-bold sm:text-base tabular-nums ${
                isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {formattedAmount}
            </span>
          </div>
        </Link>

        {/* Desktop Edit and Delete icon buttons: ALWAYS visible, with tooltips and keyboard focus */}
        <div className="hidden lg:flex items-center gap-1 shrink-0 ml-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Edit entry"
            aria-label="Edit entry"
            data-testid={`desktop-edit-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Delete entry"
            aria-label="Delete entry"
            data-testid={`desktop-delete-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="size-7 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.entry.id === next.entry.id &&
    prev.entry.amount_minor === next.entry.amount_minor &&
    prev.entry.updated_at === next.entry.updated_at &&
    prev.isSelected === next.isSelected &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSwiped === next.isSwiped &&
    prev.currency === next.currency
  );
});
