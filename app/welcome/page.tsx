"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { emailSignUpSchema } from "@/lib/schemas";
import { mapAuthErrorMessage } from "@/lib/auth/errors";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [googleError, setGoogleError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleContinueWithGoogle = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setGoogleError(mapAuthErrorMessage(error));
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setGoogleError(mapAuthErrorMessage(err));
      setIsGoogleLoading(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setEmailError(null);

    const validation = emailSignUpSchema.safeParse({
      firstName,
      email,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      if (fieldErrors.firstName?.[0]) setNameError(fieldErrors.firstName[0]);
      if (fieldErrors.email?.[0]) setEmailError(fieldErrors.email[0]);
      return;
    }

    setIsLoading(true);

    try {
      const trimmedName = validation.data.firstName.trim();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("moneymap_pending_first_name", trimmedName);
      }

      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: validation.data.email,
        options: {
          emailRedirectTo: `${origin}/auth/confirm`,
          data: {
            first_name: trimmedName,
            display_name: trimmedName,
          },
        },
      });

      if (error) {
        setEmailError(mapAuthErrorMessage(error));
        setIsLoading(false);
        return;
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(validation.data.email)}`);
    } catch (err) {
      console.error("Failed to send OTP", err);
      setEmailError(mapAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleTryWithoutAccount = () => {
    // Set 30-day guest cookie
    document.cookie = "moneymap_guest=true; path=/; max-age=2592000; SameSite=Lax";
    router.push("/");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-radial-[at_50%_0%] from-emerald-500/10 via-background to-background text-foreground">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/25 ring-8 ring-emerald-500/10 dark:bg-emerald-500">
            <Sparkles className="h-8 w-8 text-white dark:text-neutral-950" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Money Map
            </h1>
            <p className="text-sm font-medium text-muted-foreground sm:text-base">
              Track your money effortlessly with zero clutter. Private, offline-first personal finance.
            </p>
          </div>
        </div>

        {/* Action Buttons: Email (primary, filled), Google (outlined), Try without an account (small text link) */}
        <div className="space-y-3.5">
          {/* Email Flow */}
          {!showEmailForm ? (
            <button
              type="button"
              data-testid="welcome-email-toggle"
              onClick={() => setShowEmailForm(true)}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 dark:bg-emerald-500 dark:text-neutral-950 dark:hover:bg-emerald-400 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              <span>Continue with email</span>
            </button>
          ) : (
            <form onSubmit={handleSendLink} noValidate className="space-y-3 text-left">
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
                <span className="text-xs font-medium text-muted-foreground">Sign in with email</span>
              </div>

              {/* First Name Field */}
              <div className="space-y-1">
                <label htmlFor="welcome-first-name" className="text-xs font-medium text-muted-foreground">
                  Your first name
                </label>
                <input
                  id="welcome-first-name"
                  type="text"
                  data-testid="welcome-first-name-input"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Your first name"
                  maxLength={60}
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {nameError && (
                  <p
                    data-testid="welcome-name-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <label htmlFor="welcome-email" className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  id="welcome-email"
                  type="email"
                  data-testid="welcome-email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {emailError && (
                  <p
                    data-testid="welcome-email-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                data-testid="welcome-email-submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 dark:bg-emerald-500 dark:text-neutral-950 dark:hover:bg-emerald-400 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Send me a link</span>
                )}
              </button>
            </form>
          )}

          {/* Continue with Google (outlined) */}
          <div className="space-y-1.5">
            <button
              type="button"
              data-testid="welcome-google"
              onClick={handleContinueWithGoogle}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-xs transition hover:bg-accent/60 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>
            {googleError && (
              <p
                data-testid="welcome-google-error"
                className="text-xs font-medium text-destructive px-1 text-left"
              >
                {googleError}
              </p>
            )}
          </div>

          <div className="pt-2">
            {/* Try without an account: small text link */}
            <button
              type="button"
              data-testid="welcome-try-guest"
              onClick={handleTryWithoutAccount}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition cursor-pointer"
            >
              Try without an account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
