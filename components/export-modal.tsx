"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { formatDate } from "@/lib/format";
import { buildPeriodReport } from "@/lib/report/builder";
import { downloadReportPdf, preloadPdfRenderer } from "@/lib/report/pdf-export";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

export type ExportPresetOption =
  | "this_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "custom";

export interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPreset?: ExportPresetOption;
  initialCustomRange?: { start: string; end: string };
  currency?: string;
}

export function computeExportPresetRange(
  preset: ExportPresetOption,
  referenceDate = new Date(),
): { start: string; end: string } {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth(); // 0-indexed

  if (preset === "this_month") {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const mm = String(m + 1).padStart(2, "0");
    return {
      start: `${y}-${mm}-01`,
      end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  if (preset === "last_3_months") {
    const startObj = new Date(y, m - 2, 1);
    const endLastDay = new Date(y, m + 1, 0).getDate();
    const startMm = String(startObj.getMonth() + 1).padStart(2, "0");
    const endMm = String(m + 1).padStart(2, "0");
    return {
      start: `${startObj.getFullYear()}-${startMm}-01`,
      end: `${y}-${endMm}-${String(endLastDay).padStart(2, "0")}`,
    };
  }

  if (preset === "last_6_months") {
    const startObj = new Date(y, m - 5, 1);
    const endLastDay = new Date(y, m + 1, 0).getDate();
    const startMm = String(startObj.getMonth() + 1).padStart(2, "0");
    const endMm = String(m + 1).padStart(2, "0");
    return {
      start: `${startObj.getFullYear()}-${startMm}-01`,
      end: `${y}-${endMm}-${String(endLastDay).padStart(2, "0")}`,
    };
  }

  if (preset === "last_12_months") {
    const startObj = new Date(y, m - 11, 1);
    const endLastDay = new Date(y, m + 1, 0).getDate();
    const startMm = String(startObj.getMonth() + 1).padStart(2, "0");
    const endMm = String(m + 1).padStart(2, "0");
    return {
      start: `${startObj.getFullYear()}-${startMm}-01`,
      end: `${y}-${endMm}-${String(endLastDay).padStart(2, "0")}`,
    };
  }

  // Custom fallback
  const lastDay = new Date(y, m + 1, 0).getDate();
  const mm = String(m + 1).padStart(2, "0");
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function subscribeToMediaQuery(callback: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getServerSnapshot() {
  return false;
}

export function ExportModalContent({
  initialPreset = "this_month",
  initialCustomRange,
  currency = "NGN",
  onClose,
}: {
  initialPreset?: ExportPresetOption;
  initialCustomRange?: { start: string; end: string };
  currency?: string;
  onClose: () => void;
}) {
  const [preset, setPreset] = React.useState<ExportPresetOption>(initialPreset);
  const defaultRange = React.useMemo(() => computeExportPresetRange("this_month"), []);
  const [customStart, setCustomStart] = React.useState(initialCustomRange?.start || defaultRange.start);
  const [customEnd, setCustomEnd] = React.useState(initialCustomRange?.end || defaultRange.end);

  // Checkboxes for records to include (All, Income, Expenses, Giving, Lent)
  // All checked by default
  const [includeIncome, setIncludeIncome] = React.useState(true);
  const [includeExpenses, setIncludeExpenses] = React.useState(true);
  const [includeGiving, setIncludeGiving] = React.useState(true);
  const [includeLent, setIncludeLent] = React.useState(true);

  const allSelected = includeIncome && includeExpenses && includeGiving && includeLent;

  const handleToggleAll = (checked: boolean) => {
    setIncludeIncome(checked);
    setIncludeExpenses(checked);
    setIncludeGiving(checked);
    setIncludeLent(checked);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  React.useEffect(() => {
    preloadPdfRenderer().catch(() => {});
  }, []);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const categories = useLiveQuery(async () => {
    return await db.categories.toArray();
  }) || [];

  const entries = useLiveQuery(async () => {
    return await db.entries.toArray();
  }) || [];

  const loans = useLiveQuery(async () => {
    return await db.loans.toArray();
  }) || [];

  const loanPayments = useLiveQuery(async () => {
    return await db.loan_payments.toArray();
  }) || [];

  // Active date range
  const { start: periodStart, end: periodEnd } = React.useMemo(() => {
    if (preset === "custom") {
      return { start: customStart, end: customEnd };
    }
    return computeExportPresetRange(preset);
  }, [preset, customStart, customEnd]);

  const activeKinds = React.useMemo(() => {
    const list: string[] = [];
    if (includeIncome) list.push("income");
    if (includeExpenses) list.push("expense");
    if (includeGiving) list.push("giving");
    if (includeLent) list.push("lent");
    return list;
  }, [includeIncome, includeExpenses, includeGiving, includeLent]);

  const handleDownload = async () => {
    if (activeKinds.length === 0) {
      toast.error("Select at least one record type to export");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const snapshot = buildPeriodReport({
        periodStart,
        periodEnd,
        kinds: activeKinds,
        hideDetails: false,
        currency: profile?.currency || currency || "NGN",
        userName: profile?.display_name || "",
        entries,
        categories,
        loans,
        loanPayments,
        today,
      });

      await downloadReportPdf(snapshot);
      toast.success("PDF downloaded");
      onClose();
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const PRESETS: Array<{ id: ExportPresetOption; label: string }> = [
    { id: "this_month", label: "This month" },
    { id: "last_3_months", label: "Last 3 months" },
    { id: "last_6_months", label: "Last 6 months" },
    { id: "last_12_months", label: "Last 12 months" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-col h-full max-h-[90dvh] lg:max-h-[min(640px,85vh)] overflow-hidden">
      {/* Header (No decorative icon next to title per Item 4) */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border/40">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Export PDF
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose a period and record types to download as a PDF report.
        </p>
      </div>

      {/* Body: Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-left">
        {/* Period selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Period
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`export-preset-${p.id}`}
                  onClick={() => setPreset(p.id)}
                  className={`rounded-xl border py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Pickers (DD-MM-YYYY, no future dates) */}
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <DateField
                  label="From"
                  value={customStart}
                  onChange={setCustomStart}
                  maxDate={customEnd}
                />
              </div>
              <div>
                <DateField
                  label="To"
                  value={customEnd}
                  onChange={setCustomEnd}
                  minDate={customStart}
                />
              </div>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground font-medium pt-0.5">
            Date range: {formatDate(periodStart)} to {formatDate(periodEnd)}
          </div>
        </div>

        {/* Records to include */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Records to include
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                data-testid="export-kind-all"
                checked={allSelected}
                onChange={(e) => handleToggleAll(e.target.checked)}
                className="size-4 rounded border-border text-primary accent-primary"
              />
              <span>All</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                data-testid="export-kind-income"
                checked={includeIncome}
                onChange={(e) => setIncludeIncome(e.target.checked)}
                className="size-4 rounded border-border text-primary accent-primary"
              />
              <span>Income</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                data-testid="export-kind-expenses"
                checked={includeExpenses}
                onChange={(e) => setIncludeExpenses(e.target.checked)}
                className="size-4 rounded border-border text-primary accent-primary"
              />
              <span>Expenses</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                data-testid="export-kind-giving"
                checked={includeGiving}
                onChange={(e) => setIncludeGiving(e.target.checked)}
                className="size-4 rounded border-border text-primary accent-primary"
              />
              <span>Giving</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                data-testid="export-kind-lent"
                checked={includeLent}
                onChange={(e) => setIncludeLent(e.target.checked)}
                className="size-4 rounded border-border text-primary accent-primary"
              />
              <span>Lent</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer: Cancel and Download PDF buttons */}
      <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border/40 bg-background/95">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isDownloadingPdf}
          className="rounded-xl"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={isDownloadingPdf || activeKinds.length === 0}
          data-testid="export-download-pdf-btn"
          className="rounded-xl flex items-center gap-2"
        >
          <FileDown className="size-4" />
          <span>{isDownloadingPdf ? "Preparing..." : "Download PDF"}</span>
        </Button>
      </div>
    </div>
  );
}

export function ExportModal({
  open,
  onOpenChange,
  initialPreset = "this_month",
  initialCustomRange,
  currency = "NGN",
}: ExportModalProps) {
  const isDesktop = React.useSyncExternalStore(
    subscribeToMediaQuery,
    getDesktopSnapshot,
    getServerSnapshot,
  );

  const handleClose = () => {
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[480px] max-w-[480px] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        >
          <DialogTitle className="sr-only">Export PDF</DialogTitle>
          <ExportModalContent
            initialPreset={initialPreset}
            initialCustomRange={initialCustomRange}
            currency={currency}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly={true}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90dvh] max-h-[90dvh] rounded-t-3xl p-0 overflow-hidden border-t border-border bg-background">
        <DrawerTitle className="sr-only">Export PDF</DrawerTitle>
        <ExportModalContent
          initialPreset={initialPreset}
          initialCustomRange={initialCustomRange}
          currency={currency}
          onClose={handleClose}
        />
      </DrawerContent>
    </Drawer>
  );
}
