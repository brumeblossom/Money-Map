import * as React from "react";
import { InsightsView } from "@/components/insights-view";

export default function InsightsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      }
    >
      <InsightsView />
    </React.Suspense>
  );
}
