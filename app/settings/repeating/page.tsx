"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { RecurringRulesList } from "@/components/recurring-rules-list";

export default function RepeatingEntriesPage() {
  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          data-testid="repeating-back-btn"
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
          aria-label="Back to settings"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Repeat className="size-5 text-primary" />
            <span>Repeating entries</span>
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
