"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  FileDown,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  Lock,
  WifiOff,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { formatDate } from "@/lib/format";
import { buildPeriodReport } from "@/lib/report/builder";
import { downloadReportPdf, preloadPdfRenderer } from "@/lib/report/pdf-export";
import { push } from "@/lib/sync";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";

if (typeof window !== "undefined") {
  (window as unknown as { __preloadPdfRenderer?: () => Promise<void> }).__preloadPdfRenderer = preloadPdfRenderer;
}

type PresetOption = "this_month" | "last_3_months" | "last_6_months" | "last_12_months" | "custom";
type ExpiryOption = 7 | 30 | null;

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

  // Hide descriptions and names switch (default on for links, off for PDF)
  const [hideDetails, setHideDetails] = React.useState(false);

  // Share link modal / state
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [linkExpiry, setLinkExpiry] = React.useState<ExpiryOption>(30);
  const [isCreatingLink, setIsCreatingLink] = React.useState(false);
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // PDF generation state
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  // Auth / guest state
  const [isSignedIn, setIsSignedIn] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    async function checkAuth() {
      if (typeof document !== "undefined") {
        if (document.cookie.includes("moneymap_mock_user=")) {
          setIsSignedIn(true);
          return;
        }
        if (document.cookie.includes("moneymap_guest=true")) {
          setIsSignedIn(false);
          return;
        }
      }
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        setIsSignedIn(Boolean(data.session?.user));
      } catch {
        setIsSignedIn(false);
      }
    }
    void checkAuth();

    // Idle preload of PDF renderer so offline PDF generation works
    const timer = setTimeout(() => {
      preloadPdfRenderer().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const isGuest = isSignedIn === false;

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

  const handleOpenShareModal = () => {
    if (activeKinds.length === 0) {
      toast.error("Select at least one action to export");
      return;
    }

    // Default hideDetails to true for share links as per PRD
    setHideDetails(true);
    setCreatedUrl(null);
    setShowShareModal(true);
  };

  const handleCreateShareLink = async () => {
    // Check network
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You need internet to create a link");
      return;
    }

    // Check auth
    if (isGuest) {
      toast.error("Sign in to share a link");
      return;
    }

    setIsCreatingLink(true);
    try {
      // 1. Run sync push so server has latest changes
      try {
        await push();
      } catch (pushErr) {
        console.warn("Sync push before share link encountered error:", pushErr);
      }

      // 2. Call POST /api/share-links
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          kinds: activeKinds,
          hide_details: hideDetails,
          expires_in_days: linkExpiry,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Rate limit reached. Please wait a minute.");
          return;
        }
        if (res.status === 401) {
          toast.error("Sign in to share a link");
          return;
        }
        throw new Error(`Failed to create share link: ${res.status}`);
      }

      const data = await res.json();
      setCreatedUrl(data.url);
      toast.success("Share link created");
    } catch (err) {
      console.error("Share link creation failed:", err);
      toast.error("Failed to create share link");
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (!createdUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Money Map Report",
          text: `Financial report for ${formatDate(periodStart)} to ${formatDate(periodEnd)}`,
          url: createdUrl,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Sharing failed");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/records"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/80 transition-colors"
          aria-label="Back to Records"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Export and Share
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Export a period as a PDF or create a public shareable link.
          </p>
        </div>
      </div>

      {/* 1. Period Picker */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-4">
        <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Period
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { id: "this_month", label: "This month" },
            { id: "last_3_months", label: "Last 3 months" },
            { id: "last_6_months", label: "Last 6 months" },
            { id: "last_12_months", label: "Last 12 months" },
            { id: "custom", label: "Custom" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`export-preset-${opt.id}`}
              onClick={() => setPreset(opt.id as PresetOption)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                preset === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {preset === "custom" && (
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                From
              </label>
              <DateField
                data-testid="export-custom-start"
                value={customStart}
                onChange={(val) => setCustomStart(val)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                To
              </label>
              <DateField
                data-testid="export-custom-end"
                value={customEnd}
                onChange={(val) => setCustomEnd(val)}
              />
            </div>
          </div>
        )}

        <div className="pt-1 text-xs text-muted-foreground">
          Selected range:{" "}
          <span className="font-semibold text-foreground">
            {formatDate(periodStart)} to {formatDate(periodEnd)}
          </span>
        </div>
      </div>

      {/* 2. Actions Filter */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-3">
        <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Include in Report
        </label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
              data-testid="export-kind-expense"
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
            <span>Money I lent</span>
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

      {/* 4. Action Buttons Side by Side */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          data-testid="export-download-pdf-btn"
          className="flex items-center justify-center gap-2 rounded-xl py-5 text-sm font-semibold shadow-xs"
        >
          <FileDown className="size-4" />
          <span>{isDownloadingPdf ? "Preparing..." : "Download PDF"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleOpenShareModal}
          data-testid="export-create-share-link-btn"
          className="flex items-center justify-center gap-2 rounded-xl border-border/80 py-5 text-sm font-semibold shadow-xs"
        >
          <LinkIcon className="size-4" />
          <span>Create share link</span>
        </Button>
      </div>

      {/* Share Link Modal / Sheet */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Create share link
              </h2>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Guest warning */}
            {isGuest ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4 shrink-0" />
                  <span>Sign in to share a link</span>
                </div>
                <p>Public links require an account so your data can be securely hosted.</p>
                <Link href="/welcome">
                  <Button size="sm" className="mt-2 rounded-lg">
                    Sign in
                  </Button>
                </Link>
              </div>
            ) : typeof navigator !== "undefined" && !navigator.onLine ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <WifiOff className="size-4 shrink-0" />
                <span>You need internet to create a link</span>
              </div>
            ) : createdUrl ? (
              /* Success display */
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view this read-only summary:
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-2.5">
                  <input
                    type="text"
                    readOnly
                    data-testid="export-dialog-url-input"
                    value={createdUrl}
                    className="w-full bg-transparent text-xs text-foreground focus:outline-hidden"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyLink}
                    data-testid="export-dialog-copy-btn"
                    className="shrink-0 h-8 gap-1.5"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowShareModal(false)}
                    className="rounded-xl"
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNativeShare}
                    data-testid="export-dialog-share-btn"
                    className="rounded-xl gap-2"
                  >
                    <Share2 className="size-4" />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Link Configuration */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Link expires
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 7, label: "7 days" },
                      { value: 30, label: "30 days" },
                      { value: null, label: "Never" },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setLinkExpiry(opt.value as ExpiryOption)}
                        className={`rounded-xl border py-2 text-xs font-semibold ${
                          linkExpiry === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-medium text-foreground">
                      Hide descriptions and names
                    </span>
                    <input
                      type="checkbox"
                      data-testid="export-modal-hide-details-switch"
                      checked={hideDetails}
                      onChange={(e) => setHideDetails(e.target.checked)}
                      className="size-4 rounded border-border text-primary accent-primary"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowShareModal(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateShareLink}
                    disabled={isCreatingLink}
                    data-testid="export-modal-submit-btn"
                    className="rounded-xl"
                  >
                    {isCreatingLink ? "Creating..." : "Create link"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
