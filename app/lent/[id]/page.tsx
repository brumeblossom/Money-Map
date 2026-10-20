export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Loan detail</h2>
      <p className="text-sm text-muted-foreground">
        Timeline of money received, Record money received for loan: {id}
      </p>
    </div>
  );
}
