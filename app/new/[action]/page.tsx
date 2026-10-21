import * as React from "react";
import { HomeView } from "@/components/home-view";

export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  const { action } = await params;
  return (
    <React.Suspense fallback={null}>
      <HomeView activeAction={action} />
    </React.Suspense>
  );
}

