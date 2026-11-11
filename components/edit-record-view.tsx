"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { EntryForm } from "@/components/entry-form";
import { Button } from "@/components/ui/button";
import { useReturnTo, getBackLinkText } from "@/lib/navigation";

export interface EditRecordViewProps {
  id: string;
}

export function EditRecordView({ id }: EditRecordViewProps) {
  const router = useRouter();

  const entry = useLiveQuery(async () => {
    return await db.entries.get(id);
  }, [id]);

  const profile = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    return profiles[0] ?? null;
  });

  const currency = profile?.currency || "NGN";

  const tab = entry ? (entry.kind === "expense" ? "expenses" : entry.kind) : "expenses";
  const defaultUrl = `/records?tab=${tab}`;
  const returnTo = useReturnTo(defaultUrl);
  const backLabel = getBackLinkText(returnTo);

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
        <Link href={returnTo} replace>
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
        <Link
          href={returnTo}
          replace
          data-testid="edit-record-back-btn"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
        <EntryForm
          key={entry.id}
          action={entry.kind}
          initialEntry={entry}
          onClose={() => router.replace(returnTo)}
          onSaveSuccess={() => router.replace(returnTo)}
          currency={currency}
        />
      </div>
    </div>
  );
}
