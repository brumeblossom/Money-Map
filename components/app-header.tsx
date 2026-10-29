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
import { BrandLogoMark } from "@/components/brand-logo";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Home",
  "/records": "Records",
  "/lent": "Money I lent",
  "/insights": "Dashboard",
  "/insights/habits": "Habits",
  "/export": "Export",
  "/settings": "Settings",
  "/admin": "Admin",
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

  const [isSignedIn, setIsSignedIn] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function checkAuth() {
      if (typeof document !== "undefined") {
        if (document.cookie.includes("moneymap_mock_user=")) {
          setIsSignedIn(true);
          return;
        }
      }
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        setIsSignedIn(Boolean(data.session?.user));

        const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsSignedIn(Boolean(session?.user));
        });
        subscription = authSub.subscription;
      } catch {
        setIsSignedIn(false);
      }
    }
    checkAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Compute display status and label strictly per Section A
  const isBrowserOffline = isClient && (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine));
  const isGuest = isSignedIn === false;
  const isSyncing = isClient && !isBrowserOffline && engineStatus === "syncing";
  const isSyncError = isClient && !isBrowserOffline && (engineStatus === "error" || (outboxCount > 0 && !isSyncing && engineStatus !== "synced"));

  let label = "Synced";
  if (isGuest) {
    if (isBrowserOffline) {
      if (outboxCount === 1) {
        label = "Offline (1 change waiting)";
      } else if (outboxCount > 1) {
        label = `Offline (${outboxCount} changes waiting)`;
      } else {
        label = "Offline";
      }
    } else {
      label = "Saved on this device · Sign in to back up";
    }
  } else {
    if (isBrowserOffline) {
      if (outboxCount === 1) {
        label = "Offline (1 change waiting)";
      } else if (outboxCount > 1) {
        label = `Offline (${outboxCount} changes waiting)`;
      } else {
        label = "Offline";
      }
    } else if (isSyncing) {
      label = "Syncing";
    } else if (isSyncError) {
      label = "Couldn't sync, retrying";
    } else {
      label = "Synced";
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <BrandLogoMark size="sm" className="lg:hidden" />
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {displayTitle}
        </h1>
      </div>

      {/* Sync Status Badge (PRD Section 8 / Section A) */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          isBrowserOffline
            ? "bg-secondary text-money-expense-text"
            : isSyncing
              ? "bg-secondary text-primary"
              : isSyncError
                ? "bg-secondary text-destructive"
                : isGuest
                  ? "bg-secondary text-muted-foreground"
                  : "bg-secondary text-muted-foreground",
        )}
        title={`Sync status: ${label}`}
        aria-label={`Sync status: ${label}`}
        data-testid="header-sync-badge"
      >
        {isBrowserOffline ? (
          <CloudOff className="size-3.5 shrink-0 text-money-expense-text" />
        ) : isSyncing ? (
          <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : isSyncError ? (
          <RefreshCw className="size-3.5 shrink-0 text-destructive" />
        ) : isGuest ? (
          <Cloud className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <>
            <Cloud className="size-3.5 shrink-0 text-primary" />
            <CheckCircle2 className="size-3 shrink-0 text-money-income" />
          </>
        )}
        <span className="truncate">{label}</span>
      </div>
    </header>
  );
}

