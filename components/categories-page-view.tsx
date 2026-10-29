"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CategoriesSettings } from "@/components/categories-settings";
import type { CategoryScope } from "@/lib/db/dexie";

export function CategoriesPageView() {
  const searchParams = useSearchParams();
  const groupParam = searchParams.get("group");

  const initialScope: CategoryScope = React.useMemo(() => {
    if (
      groupParam === "expense" ||
      groupParam === "giving" ||
      groupParam === "lent" ||
      groupParam === "income"
    ) {
      return groupParam;
    }
    return "income";
  }, [groupParam]);

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          data-testid="categories-back-btn"
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted cursor-pointer"
          aria-label="Back to settings"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Categories
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage, reorder, and customize categories for all transactions.
          </p>
        </div>
      </div>

      {/* Categories manager without limit */}
      <CategoriesSettings initialScope={initialScope} />
    </div>
  );
}
