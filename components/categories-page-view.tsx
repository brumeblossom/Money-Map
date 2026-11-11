"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CategoriesSettings } from "@/components/categories-settings";
import type { CategoryScope } from "@/lib/db/dexie";
import { useReturnTo, getBackLinkText } from "@/lib/navigation";

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
          data-testid="categories-back-btn"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          aria-label={`Back to ${backLabel}`}
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
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

