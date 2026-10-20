export default async function CategoryReportPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Category report</h2>
      <p className="text-sm text-muted-foreground">Full report for category: {categoryId}</p>
    </div>
  );
}
