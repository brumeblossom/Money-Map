import * as React from "react";
import { RecordsView } from "@/components/records-view";

export default function RecordsPage() {
  return (
    <React.Suspense fallback={null}>
      <RecordsView />
    </React.Suspense>
  );
}
