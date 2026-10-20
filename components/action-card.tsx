"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "cn";
import { formatMoney } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export interface ActionCardProps {
  label: "Money in" | "Money out" | "Giving" | "Money I lent";
  amountMinor: number;
  currency?: string;
  icon: LucideIcon;
  href: string;
  onClick?: () => void;
  className?: string;
  badge?: string;
}

export function ActionCard({
  label,
  amountMinor,
  currency = "NGN",
  icon: Icon,
  href,
  onClick,
  className,
  badge,
}: ActionCardProps) {
  const isMoneyIn = label === "Money in";
  const isMoneyOut = label === "Money out";
  const isGiving = label === "Giving";

  const colorStyles = isMoneyIn
    ? "hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : isMoneyOut
      ? "hover:border-rose-500/40 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : isGiving
        ? "hover:border-purple-500/40 hover:bg-purple-500/5 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400"
        : "hover:border-amber-500/40 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400";

  const iconBgStyles = isMoneyIn
    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400"
    : isMoneyOut
      ? "bg-rose-500/10 text-rose-600 dark:bg-rose-400/20 dark:text-rose-400"
      : isGiving
        ? "bg-purple-500/10 text-purple-600 dark:bg-purple-400/20 dark:text-purple-400"
        : "bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400";

  const formattedAmount = formatMoney(amountMinor, currency);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-xs transition-all duration-200 active:scale-[0.98]",
        colorStyles,
        className,
      )}
      aria-label={`${label}, ${formattedAmount}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            iconBgStyles,
          )}
        >
          <Icon className="size-5" />
        </div>
        {badge && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col">
        <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {label}
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {formattedAmount}
        </span>
      </div>
    </Link>
  );
}
