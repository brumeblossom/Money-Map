"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getAuthErrorPageMessage } from "@/lib/auth/errors";

export function AuthErrorClient() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const message = getAuthErrorPageMessage(reason);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-radial-[at_50%_0%] from-emerald-500/10 via-background to-background text-foreground">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Error Icon */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 ring-8 ring-destructive/5 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Unable to sign in
            </h1>
            <p
              data-testid="auth-error-message"
              className="text-sm font-medium text-muted-foreground leading-relaxed px-2"
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <Link
            href="/welcome"
            data-testid="auth-error-try-again"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] dark:bg-emerald-500 dark:text-neutral-950 dark:hover:bg-emerald-400"
          >
            <span>Try again</span>
          </Link>

          <div>
            <Link
              href="/welcome"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to welcome</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
