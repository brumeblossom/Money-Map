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
    <main className="flex min-h-screen flex-col items-center justify-start sm:justify-center p-4 sm:p-6 bg-gradient-to-b from-secondary/40 via-background to-background text-foreground pt-8 sm:pt-6">
      {/* Small Back to home link above the card */}
      <div className="w-full max-w-[440px] mb-3 flex items-center justify-start">
        <Link
          href="/"
          data-testid="auth-error-back-home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Centred Card */}
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs text-center space-y-6">
        {/* Error Icon */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-xs">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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

        {/* Action Button: Try again */}
        <div className="space-y-3 pt-2">
          <Link
            href="/welcome"
            data-testid="auth-error-try-again"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <span>Try again</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
