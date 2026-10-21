"use client";

import * as React from "react";
import Link from "next/link";
import { X, ShieldAlert } from "lucide-react";
import { getCurrentUserId, isGuestBannerDismissed, dismissGuestBanner } from "@/lib/repo";
import { useEntries } from "@/lib/repo/hooks";

export function GuestBanner() {
  const [isDismissed, setIsDismissed] = React.useState<boolean | null>(null);
  const entries = useEntries();

  React.useEffect(() => {
    let isMounted = true;
    isGuestBannerDismissed().then((dismissed) => {
      if (isMounted) {
        setIsDismissed(dismissed);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeEntriesCount = React.useMemo(() => {
    return (entries ?? []).filter((e) => !e.deleted_at).length;
  }, [entries]);

  const isGuest = !getCurrentUserId();
  const shouldShow =
    isGuest &&
    activeEntriesCount >= 3 &&
    isDismissed === false;

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = async () => {
    setIsDismissed(true);
    await dismissGuestBanner(7);
  };

  return (
    <div
      data-testid="guest-banner"
      className="relative flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200 transition-all duration-200"
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium leading-snug">
          Save your data: sign in so you don&apos;t lose it
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/welcome?intent=signin"
          data-testid="guest-banner-signin"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400"
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          data-testid="guest-banner-dismiss"
          className="rounded-md p-1 text-amber-700 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss banner for 7 days"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
