import * as React from "react";
import { CategoriesPageView } from "@/components/categories-page-view";

export const instant = false;

export default function CategoriesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-6 text-center text-xs text-muted-foreground">
          Loading categories...
        </div>
      }
    >
      <CategoriesPageView />
    </React.Suspense>
  );
}
