import * as React from "react";
import { ExportView } from "@/components/export-view";

export default function ExportPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-6 text-center text-xs text-muted-foreground">
          Loading export...
        </div>
      }
    >
      <ExportView />
    </React.Suspense>
  );
}
