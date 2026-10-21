"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Cloud } from "lucide-react";
import { cn } from "cn";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Home",
  "/records": "Records",
  "/lent": "Money I lent",
  "/insights": "Dashboard",
  "/insights/habits": "Habits",
  "/export": "Export",
  "/settings": "Settings",
  "/welcome": "Welcome",
  "/auth/check-email": "Check your email",
};

export function getTitleFromPathname(pathname: string): string {
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }
  if (pathname.startsWith("/new/")) {
    const action = pathname.replace("/new/", "");
    const map: Record<string, string> = {
      income: "Income",
      expense: "Expenses",
      giving: "Giving",
      lent: "Money I lent",
    };
    return map[action] || "Entry form";
  }
  if (pathname.startsWith("/records/") && pathname.endsWith("/edit")) {
    return "Edit entry";
  }
  if (pathname.startsWith("/records/")) {
    return "Entry detail";
  }
  if (pathname.startsWith("/lent/")) {
    return "Loan detail";
  }
  if (pathname.startsWith("/insights/habits/")) {
    return "Category report";
  }
  if (pathname.startsWith("/s/")) {
    return "Shared report";
  }
  return "Money Map";
}

export function AppHeader({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const displayTitle = title || getTitleFromPathname(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {displayTitle}
        </h1>
      </div>

      {/* Sync Status Badge (PRD Requirement: static "Synced" for now) */}
      <div
        className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground"
        title="Sync status: Synced"
        aria-label="Sync status: Synced"
      >
        <Cloud className="size-3.5 text-primary" />
        <CheckCircle2 className="size-3 text-money-in" />
        <span className="hidden sm:inline">Synced</span>
      </div>
    </header>
  );
}
