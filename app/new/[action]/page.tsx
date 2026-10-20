export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  const { action } = await params;
  const actionLabels: Record<string, string> = {
    income: "Money in",
    expense: "Money out",
    giving: "Giving",
    lent: "Money I lent",
  };
  const label = actionLabels[action] || action;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Entry form</h2>
      <p className="text-sm text-muted-foreground">Recording: {label}</p>
    </div>
  );
}
