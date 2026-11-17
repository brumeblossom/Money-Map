"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecurringRulesList } from "@/components/recurring-rules-list";
import { useReturnTo } from "@/lib/navigation";

function RepeatingEntriesContent() {
  const defaultUrl = "/settings";
  const returnTo = useReturnTo(defaultUrl);

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-2">
        <Link
          href={returnTo}
          replace
          data-testid="repeating-back-btn"
          aria-label="Back to Settings"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer -ml-2"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Repeating entries
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage your weekly and monthly reminders.
          </p>
        </div>
      </div>

      {/* Rules list */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <RecurringRulesList />
      </div>
    </div>
  );
}

export default function RepeatingEntriesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-6 text-center text-xs text-muted-foreground">
          Loading repeating entries...
        </div>
      }
    >
      <RepeatingEntriesContent />
    </React.Suspense>
  );
}
