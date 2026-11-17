"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { EntryForm } from "@/components/entry-form";
import { Button } from "@/components/ui/button";
import { getBackLinkText, resolveReturnUrl } from "@/lib/navigation";

export interface EditRecordViewProps {
  id: string;
}

export function EditRecordView({ id }: EditRecordViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get("from");

  const entry = useLiveQuery(async () => {
    return await db.entries.get(id);
  }, [id]);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const currency = profile?.currency || "NGN";

  const getResolvedReturnTo = React.useCallback(() => {
    return resolveReturnUrl(fromParam, entry?.kind);
  }, [fromParam, entry?.kind]);

  const resolvedReturnTo = getResolvedReturnTo();
  const backLabel = getBackLinkText(resolvedReturnTo);

  if (entry === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entry || entry.deleted_at !== null) {
    return (
      <div className="space-y-4 p-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Entry not found</h2>
        <p className="text-sm text-muted-foreground">
          This entry may have been deleted or does not exist.
        </p>
        <Link href={getResolvedReturnTo()} replace>
          <Button variant="outline" className="mt-4 rounded-xl">
            Back to {backLabel}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.replace(getResolvedReturnTo())}
          data-testid="edit-record-back-btn"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
        <EntryForm
          key={entry.id}
          action={entry.kind}
          initialEntry={entry}
          onClose={() => router.replace(getResolvedReturnTo())}
          onSaveSuccess={() => router.replace(getResolvedReturnTo())}
          currency={currency}
        />
      </div>
    </div>
  );
}
