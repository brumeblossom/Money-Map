"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  X,
  Check,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Heart,
  Tag,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { db, type EntryKind, type EntryRow, type CategoryRow } from "@/lib/db/dexie";
import { softDeleteEntry, restoreEntry } from "@/lib/repo";
import { signedAmount, getPeriodPreset } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PeriodPreset = "all" | "thisWeek" | "thisMonth" | "last3Months" | "thisYear" | "custom";

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

export function RecordsView() {
  const router = useRouter();

  // Filters state
  const [selectedKinds, setSelectedKinds] = React.useState<EntryKind[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [periodPreset, setPeriodPreset] = React.useState<PeriodPreset>("all");
  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = React.useState<boolean>(false);

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState<boolean>(false);

  // Swipe-to-reveal state for mobile rows (stores entry id currently swiped open)
  const [swipedEntryId, setSwipedEntryId] = React.useState<string | null>(null);

  // Delete confirmation modal state
  const [entryToDelete, setEntryToDelete] = React.useState<EntryRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Live queries from Dexie
  const entries = useLiveQuery(async () => {
    const list = await db.entries.toArray();
    // Exclude soft-deleted entries
    return list.filter((e) => e.deleted_at === null);
  }, []);

  const categories = useLiveQuery(async () => {
    return await db.categories
      .filter((c) => c.deleted_at === null && !c.is_hidden)
      .toArray();
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

  // Filter and sort entries
  const filteredEntries = React.useMemo(() => {
    if (!entries) return [];

    let result = entries;

    // Filter by kind (Action multi-select)
    if (selectedKinds.length > 0) {
      const kindSet = new Set(selectedKinds);
      result = result.filter((e) => kindSet.has(e.kind));
    }

    // Filter by category
    if (selectedCategoryId !== "all") {
      result = result.filter((e) => e.category_id === selectedCategoryId);
    }

    // Filter by period
    if (periodPreset !== "all") {
      const range =
        periodPreset === "custom"
          ? customRange
          : getPeriodPreset(periodPreset, today);

      result = result.filter(
        (e) => e.occurred_on >= range.start && e.occurred_on <= range.end,
      );
    }

    // Filter by search query (description, counterparty/source/recipient, category name)
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
    selectedKinds,
    selectedCategoryId,
    periodPreset,
    customRange,
    searchQuery,
    categoryMap,
    today,
  ]);

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

    // Groups are already ordered descending because entries are sorted
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

  // Overall net total of filtered entries for footer
  const overallNetTotalMinor = React.useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + signedAmount(curr), 0);
  }, [filteredEntries]);

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

  // Action chip toggle
  const toggleKind = (kind: EntryKind) => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  };

  // Toggle single selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        setIsSelectionMode(false);
      } else {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
      setIsSelectionMode(true);
    }
  };

  // Clear selection
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
      // Remove from selectedIds if selected
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

  // Format signed money string helper: +₦X, -₦X, or ₦0.00
  const formatSigned = (minor: number) => {
    if (minor > 0) {
      return `+${formatMoney(minor, currency)}`;
    }
    if (minor < 0) {
      return `-${formatMoney(Math.abs(minor), currency)}`;
    }
    return formatMoney(0, currency);
  };

  return (
    <div className="relative flex flex-col space-y-4 pb-24">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Records
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            All your income, expense and giving entries.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search description, source, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 rounded-xl pr-9 pl-10 text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Chips Container */}
      <div className="space-y-2.5">
        {/* Row 1: Action (Multi-select) Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">Action:</span>
          <button
            type="button"
            onClick={() => toggleKind("income")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedKinds.includes("income")
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectedKinds.includes("income") && <Check className="size-3" />}
            Money in
          </button>
          <button
            type="button"
            onClick={() => toggleKind("expense")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedKinds.includes("expense")
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectedKinds.includes("expense") && <Check className="size-3" />}
            Money out
          </button>
          <button
            type="button"
            onClick={() => toggleKind("giving")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedKinds.includes("giving")
                ? "bg-violet-600 text-white shadow-xs"
                : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectedKinds.includes("giving") && <Check className="size-3" />}
            Giving
          </button>

          {/* Category Chip / Dropdown Picker */}
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategoryId !== "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="size-3" />
              <span>
                {selectedCategoryId === "all"
                  ? "All Categories"
                  : categoryMap.get(selectedCategoryId)?.name || "Category"}
              </span>
              <ChevronDown className="size-3" />
            </button>

            {categoryDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setCategoryDropdownOpen(false)}
                />
                <div className="absolute right-0 z-40 mt-1 max-h-60 w-52 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId("all");
                      setCategoryDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      selectedCategoryId === "all"
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>All Categories</span>
                    {selectedCategoryId === "all" && <Check className="size-3" />}
                  </button>
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        selectedCategoryId === cat.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {selectedCategoryId === cat.id && <Check className="size-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Period Presets Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">Period:</span>
          {(
            [
              { key: "all", label: "All" },
              { key: "thisWeek", label: "This week" },
              { key: "thisMonth", label: "This month" },
              { key: "last3Months", label: "3 months" },
              { key: "thisYear", label: "This year" },
              { key: "custom", label: "Custom" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setPeriodPreset(preset.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                periodPreset === preset.key
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker (shown when period === "custom") */}
        {periodPreset === "custom" && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:w-80">
            <DateField
              label="Start date"
              value={customRange.start}
              onChange={(s) => setCustomRange((prev) => ({ ...prev, start: s }))}
            />
            <DateField
              label="End date"
              value={customRange.end}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e }))}
            />
          </div>
        )}
      </div>

      {/* Entries List / Virtualized Container */}
      <div
        ref={parentRef}
        data-testid="records-list-container"
        className="h-[calc(100vh-340px)] min-h-[360px] w-full overflow-y-auto rounded-2xl border border-border/60 bg-card p-2 shadow-xs sm:p-3 touch-pan-y"
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
                    <span
                      className={`text-xs font-semibold ${
                        item.netTotalMinor > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : item.netTotalMinor < 0
                          ? "text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatSigned(item.netTotalMinor)}
                    </span>
                  </div>
                );
              }

              // Entry Row
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

      {/* Filtered Count & Total Footer */}
      <div
        data-testid="records-footer"
        className="flex items-center justify-between px-2 text-xs text-muted-foreground sm:text-sm"
      >
        <span>
          {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"} · total{" "}
          <strong className="font-semibold text-foreground">
            {formatSigned(overallNetTotalMinor)}
          </strong>
        </span>
      </div>

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
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10"
            >
              {selectedIds.size === filteredEntries.length ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selection"
              className="rounded-full p-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
    </div>
  );
}

// ============================================================================
// Record Row Item with Swipe-Left (mobile) and Checkbox (desktop)
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

  // Touch & pointer tracking for swipe and long-press
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = React.useRef(false);

  const startLongPress = (x: number, y: number) => {
    touchStartRef.current = { x, y, time: Date.now() };
    didLongPressRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // 500ms long press to enter selection mode
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

  // Pointer events (unifies mouse and touch for long-press)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startLongPress(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  // Touch handlers for swipe-left (mobile gesture)
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

    if (didLongPressRef.current) {
      return;
    }

    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Horizontal swipe left > 50px (and vertical movement < 40px)
    if (dx < -50 && Math.abs(dy) < 40) {
      onSetSwiped(true);
    } else if (dx > 40) {
      onSetSwiped(false);
    }
  };

  // Handle click on the row / link
  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If this click is the release of a long press, suppress action and reset
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
      {/* Revealed Swipe Action Buttons (Underneath) */}
      <div className="absolute inset-y-0 right-0 z-0 flex items-center pr-1">
        <button
          type="button"
          data-testid="swipe-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
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
          className="ml-1 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-opacity hover:opacity-90"
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
        {/* Checkbox (Always visible on desktop or in selection mode) */}
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

        {/* Clickable Area to View Detail */}
        <Link
          href={`/records/${entry.id}`}
          onClick={handleRowClick}
          className="flex min-w-0 flex-1 items-center justify-between"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Action Icon */}
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

            {/* Category & Counterparty / Description */}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {categoryName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.counterparty || entry.description || formatDate(entry.occurred_on)}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right">
            <span
              className={`text-sm font-bold sm:text-base ${
                isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {formattedAmount}
            </span>
          </div>
        </Link>
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
