"use client";

import * as React from "react";
import Link from "next/link";
import { FileDown, Link as LinkIcon, Copy, Check, Share2, Lock, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/lib/report/pdf-export";
import type { ReportSnapshot } from "@/lib/report/types";
import { push } from "@/lib/sync";

export interface RecordExportBarProps {
  type: "entries" | "loans";
  id: string;
  date: string; // YYYY-MM-DD
  kind: string; // "income" | "expense" | "giving" | "lent"
  getSnapshot: (hideDetails: boolean) => ReportSnapshot;
}

export function RecordExportBar({
  type,
  id,
  date,
  kind,
  getSnapshot,
}: RecordExportBarProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [hideDetails, setHideDetails] = React.useState(true);
  const [linkExpiry, setLinkExpiry] = React.useState<7 | 30 | null>(30);
  const [isCreatingLink, setIsCreatingLink] = React.useState(false);
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

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

    const timer = setTimeout(() => {
      import("@react-pdf/renderer").catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const isGuest = isSignedIn === false;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      // PDF default hideDetails is false as per PRD
      const snapshot = getSnapshot(false);
      await downloadReportPdf(snapshot);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You need internet to create a link");
      return;
    }

    if (isGuest) {
      toast.error("Sign in to share a link");
      return;
    }

    setIsCreatingLink(true);
    try {
      try {
        await push();
      } catch (pushErr) {
        console.warn("Sync push before single record link error:", pushErr);
      }

      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: date,
          period_end: date,
          kinds: [kind],
          hide_details: hideDetails,
          expires_in_days: linkExpiry,
          single_record: {
            table: type,
            id,
          },
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
        throw new Error(`Failed to create link: ${res.status}`);
      }

      const data = await res.json();
      setCreatedUrl(data.url);
      toast.success("Share link created");
    } catch (err) {
      console.error("Single record link error:", err);
      toast.error("Failed to create share link");
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopy = async () => {
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

  const handleShare = async () => {
    if (!createdUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Money Map Record",
          url: createdUrl,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Sharing failed");
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          data-testid="record-export-pdf-btn"
          className="flex items-center justify-center gap-2 rounded-xl py-5 text-sm font-semibold shadow-xs"
        >
          <FileDown className="size-4" />
          <span>{isDownloadingPdf ? "Preparing..." : "Download PDF"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setHideDetails(true);
            setCreatedUrl(null);
            setShowShareModal(true);
          }}
          data-testid="record-export-share-btn"
          className="flex items-center justify-center gap-2 rounded-xl border-border/80 py-5 text-sm font-semibold shadow-xs"
        >
          <LinkIcon className="size-4" />
          <span>Share link</span>
        </Button>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Share this record
              </h2>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isGuest ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4 shrink-0" />
                  <span>Sign in to share a link</span>
                </div>
                <p>Public links require an account to host your record securely.</p>
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
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view this read-only record:
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={createdUrl}
                    className="w-full bg-transparent text-xs text-foreground focus:outline-hidden"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
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
                    onClick={handleShare}
                    className="rounded-xl gap-2"
                  >
                    <Share2 className="size-4" />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            ) : (
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
                        onClick={() => setLinkExpiry(opt.value as 7 | 30 | null)}
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
    </>
  );
}
