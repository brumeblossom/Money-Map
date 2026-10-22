import * as React from "react";
import { CategoryHabitDetailView } from "@/components/category-habit-detail-view";

export default async function CategoryReportPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading category habit report...
        </div>
      }
    >
      <CategoryHabitDetailView categoryId={categoryId} />
    </React.Suspense>
  );
}
