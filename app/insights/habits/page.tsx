import * as React from "react";
import { HabitsView } from "@/components/habits-view";

export default function HabitsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading habits...
        </div>
      }
    >
      <HabitsView />
    </React.Suspense>
  );
}
