export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen flex-col justify-between p-6">
      <main className="mx-auto w-full max-w-xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Shared report</h1>
        <p className="text-sm text-muted-foreground">
          Public, read-only snapshot. Token: {token}
        </p>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        Money Map
      </footer>
    </div>
  );
}
