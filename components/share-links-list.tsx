"use client";

import * as React from "react";
import { Copy, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { ReportSnapshot } from "@/lib/report/types";

interface ShareLinkItem {
  id: string;
  url: string;
  period_start: string;
  period_end: string;
  kinds: string[];
  hide_details: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  snapshot: ReportSnapshot;
}

function isLinkExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function ShareLinksList() {
  const [links, setLinks] = React.useState<ShareLinkItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/share-links");
        if (res.ok && !ignore) {
          const data = await res.json();
          setLinks(data);
        }
      } catch (e) {
        console.error("Failed to fetch share links:", e);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/share-links/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Share link turned off");
        setLinks((prev) =>
          prev.map((l) =>
            l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l,
          ),
        );
      } else {
        toast.error("Failed to turn off share link");
      }
    } catch (e) {
      console.error("Error revoking link:", e);
      toast.error("Failed to turn off share link");
    } finally {
      setRevokingId(null);
    }
  };

  const getLinkLabel = (link: ShareLinkItem): string => {
    const snap = link.snapshot;
    if (snap?.type === "single_loan") {
      return snap.borrower && snap.borrower !== "Hidden"
        ? `Loan to ${snap.borrower}`
        : "Loan";
    }
    if (snap?.type === "single_entry") {
      return `${snap.action}: ${snap.category}`;
    }
    return `${formatDate(link.period_start)} to ${formatDate(link.period_end)}`;
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        Loading share links...
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        No active share links. Create one from Export or on any record page.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40 text-xs">
      {links.map((link) => {
        const isRevoked = link.revoked_at !== null;
        const isExpired = isLinkExpired(link.expires_at);
        const isActive = !isRevoked && !isExpired;

        const label = getLinkLabel(link);
        const expiryLabel = link.expires_at ? formatDate(link.expires_at) : "Never";

        return (
          <div
            key={link.id}
            data-testid="share-link-item"
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  {label}
                </span>
                {isRevoked ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Turned off
                  </span>
                ) : isExpired ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    Expired
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                Expires: <span className="text-foreground">{expiryLabel}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(link.id, link.url)}
                disabled={!isActive}
                className="h-8 gap-1.5 rounded-lg text-xs"
              >
                {copiedId === link.id ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copiedId === link.id ? "Copied" : "Copy"}</span>
              </Button>

              {isActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevoke(link.id)}
                  disabled={revokingId === link.id}
                  data-testid="revoke-share-link-btn"
                  className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg text-xs"
                >
                  <Ban className="size-3.5" />
                  <span>{revokingId === link.id ? "Turning off..." : "Turn off"}</span>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
