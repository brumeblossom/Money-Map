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
      const pendingName =
        typeof window !== "undefined"
          ? sessionStorage.getItem("moneymap_pending_first_name")
          : null;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/confirm`,
          data: pendingName
            ? { first_name: pendingName, display_name: pendingName }
            : undefined,
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
    <main className="flex min-h-screen flex-col items-center justify-start sm:justify-center p-4 sm:p-6 bg-gradient-to-b from-secondary/40 via-background to-background text-foreground pt-8 sm:pt-6">
      {/* Small Back to home link above the card */}
      <div className="w-full max-w-[440px] mb-3 flex items-center justify-start">
        <Link
          href="/"
          data-testid="check-email-back-home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Centred Card */}
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs text-center space-y-6">
        {/* Mail Icon in a soft violet circle */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary shadow-xs">
            <MailCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a magic link to{" "}
              {email ? (
                <span className="font-semibold text-foreground">{email}</span>
              ) : (
                <span className="font-semibold text-foreground">your email</span>
              )}
              . Tap the link in your email to sign in.
            </p>
          </div>
        </div>

        {/* Resend Section */}
        <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or request a new link below.
          </p>

          <button
            type="button"
            data-testid="auth-resend-button"
            onClick={handleResend}
            disabled={secondsLeft > 0 || isResending || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
                isResendError ? "text-destructive" : "text-primary font-semibold"
              }`}
            >
              {resendStatus}
            </p>
          )}
        </div>

        {/* Use a different email */}
        <div className="pt-2">
          <Link
            href="/welcome?mode=signin"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Use a different email</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
