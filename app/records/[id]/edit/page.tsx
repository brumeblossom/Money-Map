import * as React from "react";
import { EditRecordView } from "@/components/edit-record-view";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <React.Suspense fallback={null}>
      <EditRecordView id={id} />
    </React.Suspense>
  );
}
