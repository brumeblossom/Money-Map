export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Entry detail</h2>
      <p className="text-sm text-muted-foreground">Record ID: {id}</p>
    </div>
  );
}
