import * as React from "react";
import { RecordDetailView } from "@/components/record-detail-view";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <React.Suspense fallback={null}>
      <RecordDetailView id={id} />
    </React.Suspense>
  );
}
