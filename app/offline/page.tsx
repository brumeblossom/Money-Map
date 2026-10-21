import * as React from "react";
import Link from "next/link";
import { WifiOff, Home } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
        <WifiOff className="size-8" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        You&apos;re offline
      </h1>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Your entries are saved on this device and will sync when you&apos;re back online.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Home className="size-4" />
        Return to Home
      </Link>
    </div>
  );
}
