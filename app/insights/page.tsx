export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Period switcher and the dashboard blocks.
        </p>
      </div>

      {/* Two columns allowed on desktop for Insights (PRD Section 2) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground">Period Totals</h3>
          <p className="mt-2 text-xs text-muted-foreground">Income, Expenses, and Left over</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground">Cash Flow Overview</h3>
          <p className="mt-2 text-xs text-muted-foreground">Category breakdown and summaries</p>
        </div>
      </div>
    </div>
  );
}
