import { HomeView } from "@/components/home-view";

export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  const { action } = await params;
  return <HomeView activeAction={action} />;
}
