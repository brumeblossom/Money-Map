"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "cn";
import { db } from "@/lib/db/dexie";
import {
  getSyncStatus,
  subscribeSyncStatus,
  type SyncState,
} from "@/lib/sync";

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

  // 1. Reactive Dexie outbox count (PRD Section 8)
  const outboxCount = useLiveQuery(() => db.outbox.count(), []) ?? 0;

  // Hydration guard via useSyncExternalStore
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 2. Browser online state via useSyncExternalStore
  const isOnline = React.useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );

  // 3. Engine sync state via useSyncExternalStore
  const engineStatus = React.useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatus,
    () => "synced" as SyncState,
  );

  // Compute display status and label
  const isOffline = isClient && (!isOnline || engineStatus === "offline");
  const isSyncing = isClient && !isOffline && engineStatus === "syncing";

  let label = "Synced";
  if (isOffline) {
    if (outboxCount === 1) {
      label = "Offline (1 change waiting)";
    } else if (outboxCount > 1) {
      label = `Offline (${outboxCount} changes waiting)`;
    } else {
      label = "Offline";
    }
  } else if (isSyncing) {
    label = "Syncing";
  }

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

      {/* Sync Status Badge (PRD Section 8 / Prompt 10) */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          isOffline
            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
            : isSyncing
              ? "bg-primary/10 text-primary"
              : "bg-secondary/80 text-muted-foreground",
        )}
        title={`Sync status: ${label}`}
        aria-label={`Sync status: ${label}`}
        data-testid="header-sync-badge"
      >
        {isOffline ? (
          <CloudOff className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : isSyncing ? (
          <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <>
            <Cloud className="size-3.5 shrink-0 text-primary" />
            <CheckCircle2 className="size-3 shrink-0 text-money-in" />
          </>
        )}
        <span className="truncate">{label}</span>
      </div>
    </header>
  );
}
