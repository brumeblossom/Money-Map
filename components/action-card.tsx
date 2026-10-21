"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { formatMoney } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export interface ActionCardProps {
  label: "Income" | "Expenses" | "Giving" | "Money I lent" | "Money in" | "Money out";
  amountMinor: number;
  currency?: string;
  icon: LucideIcon;
  href: string;
  recordsHref?: string;
  onClick?: () => void;
  className?: string;
  badge?: string;
  "data-testid"?: string;
}

export function ActionCard({
  label,
  amountMinor,
  currency = "NGN",
  icon: Icon,
  href,
  recordsHref,
  onClick,
  className,
  badge,
  "data-testid": testId,
}: ActionCardProps) {
  const router = useRouter();
  const isIncome = label === "Income" || label === "Money in";
  const isExpenses = label === "Expenses" || label === "Money out";
  const isGiving = label === "Giving";

  const colorStyles = isIncome
    ? "hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : isExpenses
      ? "hover:border-rose-500/40 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : isGiving
        ? "hover:border-purple-500/40 hover:bg-purple-500/5 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400"
        : "hover:border-amber-500/40 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400";

  const iconBgStyles = isIncome
    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400"
    : isExpenses
      ? "bg-rose-500/10 text-rose-600 dark:bg-rose-400/20 dark:text-rose-400"
      : isGiving
        ? "bg-purple-500/10 text-purple-600 dark:bg-purple-400/20 dark:text-purple-400"
        : "bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400";

  const formattedAmount = formatMoney(amountMinor, currency);

  // Responsive font size that scales down gracefully for long amounts like ₦999,999,999.99
  const amountFontSizeClass =
    formattedAmount.length >= 15
      ? "text-xs sm:text-sm lg:text-[13px] xl:text-base"
      : formattedAmount.length >= 12
        ? "text-sm sm:text-base lg:text-sm xl:text-lg"
        : "text-base sm:text-lg lg:text-lg xl:text-xl";

  return (
    <div
      data-testid={testId}
      className={cn(
        "@container group relative flex min-h-[130px] h-full min-w-0 flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs transition-all duration-200 active:scale-[0.98] overflow-hidden",
        colorStyles,
        className,
      )}
    >
      {/* Primary Card Click Area */}
      <Link
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={`${label}, ${formattedAmount}`}
        className="absolute inset-0 z-0"
      />

      {/* Card Header (Z-10) */}
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 shrink-0",
            iconBgStyles,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {recordsHref && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(recordsHref);
              }}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title={`View ${label} records`}
              aria-label={`View ${label} records`}
            >
              Records
            </button>
          )}
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Card Content (Z-10) */}
      <div className="relative z-10 mt-3 flex flex-col min-w-0 pointer-events-none">
        <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground truncate">
          {label}
        </span>
        <span
          data-testid="action-card-amount"
          className={cn(
            "font-bold tracking-tight text-foreground tabular-nums min-w-0 whitespace-nowrap",
            amountFontSizeClass,
          )}
        >
          {formattedAmount}
        </span>
      </div>
    </div>
  );
}
