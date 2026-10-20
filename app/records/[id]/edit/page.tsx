export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Edit entry</h2>
      <p className="text-sm text-muted-foreground">Editing record: {id}</p>
    </div>
  );
}
