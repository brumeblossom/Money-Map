"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorMessage } from "@/lib/auth/errors";

export function CheckEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [secondsLeft, setSecondsLeft] = React.useState(60);
  const [isResending, setIsResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);
  const [isResendError, setIsResendError] = React.useState(false);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (secondsLeft > 0 || !email || isResending) return;

    setIsResending(true);
    setResendStatus(null);
    setIsResendError(false);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const pendingName = typeof window !== "undefined" ? sessionStorage.getItem("moneymap_pending_first_name") : null;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/confirm`,
          data: pendingName ? { first_name: pendingName, display_name: pendingName } : undefined,
        },
      });

      if (error) {
        setResendStatus(mapAuthErrorMessage(error));
        setIsResendError(true);
      } else {
        setResendStatus("Magic link resent!");
        setIsResendError(false);
        setSecondsLeft(60);
      }
    } catch (err) {
      setResendStatus(mapAuthErrorMessage(err));
      setIsResendError(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-radial-[at_50%_0%] from-emerald-500/10 via-background to-background text-foreground">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Email Icon */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/25 ring-8 ring-emerald-500/10 dark:bg-emerald-500">
            <MailCheck className="h-8 w-8 text-white dark:text-neutral-950" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a magic link to{" "}
              {email ? (
                <span className="font-semibold text-foreground">{email}</span>
              ) : (
                "your email"
              )}
              . Tap the link in your email to sign in.
            </p>
          </div>
        </div>

        {/* Resend Section */}
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or request a new link below.
          </p>

          <button
            type="button"
            data-testid="auth-resend-button"
            onClick={handleResend}
            disabled={secondsLeft > 0 || isResending || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/80 px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isResending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>
              {secondsLeft > 0 ? `Resend (${secondsLeft}s)` : "Resend link"}
            </span>
          </button>

          {resendStatus && (
            <p
              data-testid="auth-resend-status"
              className={`text-xs font-medium ${
                isResendError
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {resendStatus}
            </p>
          )}
        </div>

        {/* Back Link */}
        <div>
          <Link
            href="/welcome?intent=signin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Use a different email</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
