import * as React from "react";
import { HomeView } from "@/components/home-view";

async function NewEntryContent({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  const { action } = await params;
  return <HomeView activeAction={action} />;
}

export default function NewEntryPage({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  return (
    <React.Suspense fallback={null}>
      <NewEntryContent params={params} />
    </React.Suspense>
  );
}
