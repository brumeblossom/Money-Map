"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { FileDown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { formatDate } from "@/lib/format";
import { buildPeriodReport } from "@/lib/report/builder";
import { downloadReportPdf, preloadPdfRenderer } from "@/lib/report/pdf-export";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";

if (typeof window !== "undefined") {
  (window as unknown as { __preloadPdfRenderer?: () => Promise<void> }).__preloadPdfRenderer = preloadPdfRenderer;
}

type PresetOption = "this_month" | "last_3_months" | "last_6_months" | "last_12_months" | "custom";

function computePresetRange(preset: PresetOption, referenceDate = new Date()): { start: string; end: string } {
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

export function ExportView() {
  const [preset, setPreset] = React.useState<PresetOption>("this_month");
  const initialRange = React.useMemo(() => computePresetRange("this_month"), []);
  const [customStart, setCustomStart] = React.useState(initialRange.start);
  const [customEnd, setCustomEnd] = React.useState(initialRange.end);

  // Checkboxes for actions (all on by default)
  const [includeIncome, setIncludeIncome] = React.useState(true);
  const [includeExpenses, setIncludeExpenses] = React.useState(true);
  const [includeGiving, setIncludeGiving] = React.useState(true);
  const [includeLent, setIncludeLent] = React.useState(true);

  // Hide descriptions and names switch
  const [hideDetails, setHideDetails] = React.useState(false);

  // PDF generation state
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  React.useEffect(() => {
    // Idle preload of PDF renderer so offline PDF generation works
    const timer = setTimeout(() => {
      preloadPdfRenderer().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Query local data
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
    return computePresetRange(preset);
  }, [preset, customStart, customEnd]);

  const activeKinds = React.useMemo(() => {
    const list: string[] = [];
    if (includeIncome) list.push("income");
    if (includeExpenses) list.push("expense");
    if (includeGiving) list.push("giving");
    if (includeLent) list.push("lent");
    return list;
  }, [includeIncome, includeExpenses, includeGiving, includeLent]);

  const handleDownloadPdf = async () => {
    if (activeKinds.length === 0) {
      toast.error("Select at least one action to export");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const snapshot = buildPeriodReport({
        periodStart,
        periodEnd,
        kinds: activeKinds,
        hideDetails,
        currency: profile?.currency || "NGN",
        userName: profile?.display_name || "",
        entries,
        categories,
        loans,
        loanPayments,
      });

      await downloadReportPdf(snapshot);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const PRESETS: Array<{ id: PresetOption; label: string }> = [
    { id: "this_month", label: "This month" },
    { id: "last_3_months", label: "Last 3 months" },
    { id: "last_6_months", label: "Last 6 months" },
    { id: "last_12_months", label: "Last 12 months" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-24">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/records"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Records</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Export PDF
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Download a clean PDF report of your money for personal records or review.
        </p>
      </div>

      {/* 1. Period Picker */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all cursor-pointer ${
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

        {/* Custom Date Range Pickers (DD-MM-YYYY) */}
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

        <div className="pt-1 text-[11px] text-muted-foreground font-medium">
          Date range: {formatDate(periodStart)} to {formatDate(periodEnd)}
        </div>
      </div>

      {/* 2. Action Checkboxes */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Records to include
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              data-testid="export-kind-all"
              checked={includeIncome && includeExpenses && includeGiving && includeLent}
              onChange={(e) => {
                const val = e.target.checked;
                setIncludeIncome(val);
                setIncludeExpenses(val);
                setIncludeGiving(val);
                setIncludeLent(val);
              }}
              className="size-4 rounded border-border text-primary accent-primary"
            />
            <span>All</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              data-testid="export-kind-income"
              checked={includeIncome}
              onChange={(e) => setIncludeIncome(e.target.checked)}
              className="size-4 rounded border-border text-primary accent-primary"
            />
            <span>Income</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              data-testid="export-kind-expenses"
              checked={includeExpenses}
              onChange={(e) => setIncludeExpenses(e.target.checked)}
              className="size-4 rounded border-border text-primary accent-primary"
            />
            <span>Expenses</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              data-testid="export-kind-giving"
              checked={includeGiving}
              onChange={(e) => setIncludeGiving(e.target.checked)}
              className="size-4 rounded border-border text-primary accent-primary"
            />
            <span>Giving</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/30">
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

      {/* 3. Hide details switch */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-foreground">
              Hide descriptions and names
            </span>
            <p className="text-xs text-muted-foreground">
              Removes descriptions, borrower names and sources from the export.
            </p>
          </div>
          <input
            type="checkbox"
            data-testid="export-hide-details-switch"
            checked={hideDetails}
            onChange={(e) => setHideDetails(e.target.checked)}
            className="size-5 rounded border-border text-primary accent-primary"
          />
        </label>
      </div>

      {/* 4. Action Button: Download PDF */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          data-testid="export-download-pdf-btn"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-5 text-sm font-semibold shadow-xs cursor-pointer"
        >
          <FileDown className="size-4" />
          <span>{isDownloadingPdf ? "Preparing..." : "Download PDF"}</span>
        </Button>
      </div>
    </div>
  );
}
