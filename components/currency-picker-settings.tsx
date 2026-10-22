"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import { ISO_CURRENCIES, type CurrencyOption } from "@/lib/format/currencies";
import { useProfile } from "@/lib/repo/hooks";
import { updateProfile, createProfile } from "@/lib/repo";
import { getCurrentUserId } from "@/lib/repo/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CurrencyPickerSettings() {
  const profile = useProfile();
  const currentCurrency = profile?.currency || "NGN";

  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const filteredCurrencies = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ISO_CURRENCIES;
    return ISO_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedCurrencyInfo = React.useMemo(() => {
    return (
      ISO_CURRENCIES.find((c) => c.code === currentCurrency.toUpperCase()) || {
        code: currentCurrency,
        name: currentCurrency,
        symbol: currentCurrency,
      }
    );
  }, [currentCurrency]);

  const handleSelectCurrency = async (item: CurrencyOption) => {
    if (item.code === currentCurrency) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const userId = getCurrentUserId() || profile?.user_id || "guest";
      if (profile) {
        await updateProfile(profile.user_id, { currency: item.code });
      } else {
        await createProfile({
          user_id: userId,
          display_name: "Guest",
          currency: item.code,
        });
      }
      toast.success(`Currency changed to ${item.code} (${item.symbol})`);
      setIsOpen(false);
      setQuery("");
    } catch (err) {
      console.error("Failed to update currency", err);
      toast.error("Failed to update currency");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div id="currency" className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Currency</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Changes how money amounts are displayed. Stored amounts are never modified.
          </p>
        </div>

        <button
          type="button"
          data-testid="currency-dropdown-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition cursor-pointer shrink-0"
        >
          <span className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-primary">{selectedCurrencyInfo.symbol}</span>
            <span>{selectedCurrencyInfo.code}</span>
            <span className="text-muted-foreground font-normal hidden sm:inline">
              · {selectedCurrencyInfo.name}
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              data-testid="currency-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by currency code or name (e.g. USD, Dollar, EUR, Naira)..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Currencies list */}
          <div
            data-testid="currency-list"
            className="max-h-60 overflow-y-auto divide-y divide-border/50 rounded-xl border border-border bg-background/50"
          >
            {filteredCurrencies.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No currencies matching &quot;{query}&quot;
              </div>
            ) : (
              filteredCurrencies.map((c) => {
                const isSelected = c.code === currentCurrency.toUpperCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    data-testid={`currency-option-${c.code}`}
                    disabled={isUpdating}
                    onClick={() => handleSelectCurrency(c)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition hover:bg-muted/60 cursor-pointer",
                      isSelected && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 font-mono font-bold text-foreground">
                        {c.symbol}
                      </span>
                      <span className="font-semibold text-foreground">{c.code}</span>
                      <span className="text-muted-foreground font-normal">
                        {c.name}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
