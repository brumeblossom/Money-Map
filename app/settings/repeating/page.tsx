"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecurringRulesList } from "@/components/recurring-rules-list";
import { useReturnTo, getBackLinkText } from "@/lib/navigation";

function RepeatingEntriesContent() {
  const defaultUrl = "/settings";
  const returnTo = useReturnTo(defaultUrl);
  const backLabel = getBackLinkText(returnTo);

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href={returnTo}
          replace
          data-testid="repeating-back-btn"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          aria-label={`Back to ${backLabel}`}
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
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
