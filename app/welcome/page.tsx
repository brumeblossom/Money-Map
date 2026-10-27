"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogoMark } from "@/components/brand-logo";
import { PasswordRulesChecklist } from "@/components/password-rules-checklist";
import { createClient } from "@/lib/supabase/client";
import {
  isPasswordValid,
  signUpFormSchema,
  signInFormSchema,
  resetPasswordRequestSchema,
  setNewPasswordSchema,
} from "@/lib/validation/password";
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

function getRedirectOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

type ViewMode = "signin" | "signup" | "forgot" | "reset" | "check-email" | "reset-sent";

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");

  const computedMode: ViewMode = React.useMemo(() => {
    if (urlMode === "signup") return "signup";
    if (urlMode === "forgot") return "forgot";
    if (urlMode === "reset") return "reset";
    return "signin";
  }, [urlMode]);

  const [customMode, setCustomMode] = React.useState<ViewMode | null>(null);
  const viewMode = customMode ?? computedMode;

  const setViewMode = (m: ViewMode) => {
    setCustomMode(m);
  };

  const [firstName, setFirstName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [fieldErrors, setFieldErrors] = React.useState<{
    firstName?: string;
    email?: string;
    password?: string;
  }>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [isUnconfirmedEmail, setIsUnconfirmedEmail] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  // 60-second countdown for resend operations
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);
  const [existingAccountNotice, setExistingAccountNotice] = React.useState(false);

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
    setIsUnconfirmedEmail(false);
    setResendStatus(null);
  };

  const handleContinueWithGoogle = async () => {
    setIsGoogleLoading(true);
    clearErrors();
    try {
      const supabase = createClient();
      const origin = getRedirectOrigin();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setGeneralError(mapAuthErrorMessage(error));
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setGeneralError(mapAuthErrorMessage(err));
      setIsGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const parsed = signInFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errs.email?.[0],
        password: errs.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("invalid login credentials") ||
          msg.includes("invalid_credentials") ||
          msg.includes("invalid_grant") ||
          msg.includes("wrong password")
        ) {
          setGeneralError("Email or password is incorrect.");
        } else if (
          msg.includes("email not confirmed") ||
          msg.includes("email_not_confirmed") ||
          msg.includes("unconfirmed")
        ) {
          setIsUnconfirmedEmail(true);
        } else {
          setGeneralError(mapAuthErrorMessage(error));
        }
        setIsLoading(false);
        return;
      }

      // Successful sign-in: clear guest cookies and enter Home
      document.cookie =
        "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "mm_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "moneymap_has_session=1; path=/; max-age=2592000; SameSite=Lax";

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (err) {
      setGeneralError(mapAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const parsed = signUpFormSchema.safeParse({
      firstName,
      email,
      password,
    });

    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        firstName: errs.firstName?.[0],
        email: errs.email?.[0],
        password: errs.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    try {
      const trimmedName = firstName.trim();
      if (trimmedName && typeof window !== "undefined") {
        sessionStorage.setItem("moneymap_pending_first_name", trimmedName);
      }

      const supabase = createClient();
      const origin = getRedirectOrigin();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: trimmedName,
            display_name: trimmedName,
          },
          emailRedirectTo: `${origin}/auth/confirm?next=/`,
        },
      });

      if (error) {
        // If email already registered, do not reveal it on screen; show the same check-email card
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("already registered") ||
          msg.includes("user already exists") ||
          msg.includes("email exists")
        ) {
          setExistingAccountNotice(true);
          setResendCountdown(60);
          setViewMode("check-email");
          setIsLoading(false);
          return;
        }

        setGeneralError(mapAuthErrorMessage(error));
        setIsLoading(false);
        return;
      }

      // If user identities array is empty, Supabase already has this user
      if (data?.user?.identities && data.user.identities.length === 0) {
        setExistingAccountNotice(true);
      }

      setResendCountdown(60);
      setViewMode("check-email");
      setIsLoading(false);
    } catch (err) {
      setGeneralError(mapAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const parsed = resetPasswordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const origin = getRedirectOrigin();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/welcome?mode=reset")}`,
      });

      // Always show generic success state to avoid email enumeration
      setResendCountdown(60);
      setViewMode("reset-sent");
      setIsLoading(false);
    } catch (err) {
      console.error("Forgot password error:", err);
      // Still show the confirmation message
      setResendCountdown(60);
      setViewMode("reset-sent");
      setIsLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const parsed = setNewPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldErrors({ password: parsed.error.flatten().fieldErrors.password?.[0] });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setGeneralError(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("Password saved");
      document.cookie =
        "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "mm_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "moneymap_has_session=1; path=/; max-age=2592000; SameSite=Lax";

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (err) {
      setGeneralError(mapAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCountdown > 0 || !email || isResending) return;
    setIsResending(true);
    setResendStatus(null);

    try {
      const supabase = createClient();
      const origin = getRedirectOrigin();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/confirm?next=/`,
        },
      });

      if (error) {
        setResendStatus(mapAuthErrorMessage(error));
      } else {
        setResendStatus("Confirmation email resent!");
        setResendCountdown(60);
      }
    } catch (err) {
      setResendStatus(mapAuthErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleResendPasswordReset = async () => {
    if (resendCountdown > 0 || !email || isResending) return;
    setIsResending(true);
    setResendStatus(null);

    try {
      const supabase = createClient();
      const origin = getRedirectOrigin();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/welcome?mode=reset")}`,
      });
      setResendStatus("Reset link resent!");
      setResendCountdown(60);
    } catch (err) {
      setResendStatus(mapAuthErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleTryWithoutAccount = () => {
    document.cookie = "moneymap_guest=true; path=/; max-age=2592000; SameSite=Lax";
    document.cookie = "mm_guest=1; path=/; max-age=2592000; SameSite=Lax";
    document.cookie = "moneymap_has_session=1; path=/; max-age=2592000; SameSite=Lax";
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  // Card headers and subtitles per view mode
  let title = "Welcome back";
  let subtitle = "Sign in to your Money Map";

  if (viewMode === "signup") {
    title = "Create your account";
    subtitle = "Start tracking your income, expenses and loans today.";
  } else if (viewMode === "forgot") {
    title = "Reset your password";
    subtitle = "Enter your email to receive a password reset link.";
  } else if (viewMode === "reset") {
    title = "Set a new password";
    subtitle = "Choose a strong new password for your account.";
  } else if (viewMode === "check-email" || viewMode === "reset-sent") {
    title = "Check your email";
    subtitle = "";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start sm:justify-center p-4 sm:p-6 bg-gradient-to-b from-secondary/40 via-background to-background text-foreground pt-8 sm:pt-6">
      {/* Small Back to home link above the card */}
      <div className="w-full max-w-[440px] mb-3 flex items-center justify-start">
        <Link
          href="/"
          data-testid="welcome-back-home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Centred Card */}
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        {/* Inside: Logo mark, title, subtitle */}
        <div className="text-center space-y-3 mb-6">
          <BrandLogoMark size="lg" className="mx-auto shadow-sm" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm font-medium text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* VIEW 1: SIGN IN */}
        {viewMode === "signin" && (
          <div className="space-y-4">
            {/* Continue with Google */}
            <button
              type="button"
              data-testid="welcome-google"
              onClick={handleContinueWithGoogle}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 h-12 sm:h-[52px] rounded-[12px] border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-xs transition hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider "or" */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
                or
              </div>
            </div>

            {/* Sign-in Form */}
            <form onSubmit={handleSignIn} noValidate className="space-y-3.5 text-left">
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="welcome-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="welcome-email"
                  type="email"
                  data-testid="welcome-email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (generalError) setGeneralError(null);
                    if (isUnconfirmedEmail) setIsUnconfirmedEmail(false);
                  }}
                  placeholder="name@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                {fieldErrors.email && (
                  <p
                    data-testid="welcome-email-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password with Forgot password? link */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="welcome-password"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setViewMode("forgot");
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="welcome-password"
                    type={showPassword ? "text" : "password"}
                    data-testid="welcome-password-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-11 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    data-testid="welcome-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p
                    data-testid="welcome-password-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Inline Errors */}
              {generalError && (
                <p
                  data-testid="welcome-auth-error"
                  className="text-xs font-medium text-destructive px-1"
                >
                  {generalError}
                </p>
              )}

              {/* Email Not Confirmed prompt */}
              {isUnconfirmedEmail && (
                <div className="space-y-1.5 rounded-xl border border-border bg-background/60 p-3">
                  <p
                    data-testid="welcome-unconfirmed-error"
                    className="text-xs font-medium text-destructive"
                  >
                    Please confirm your email first.
                  </p>
                  <button
                    type="button"
                    data-testid="welcome-resend-confirm"
                    onClick={handleResendConfirmation}
                    disabled={resendCountdown > 0 || isResending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isResending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    <span>
                      {resendCountdown > 0
                        ? `Resend confirmation email (${resendCountdown}s)`
                        : "Resend confirmation email"}
                    </span>
                  </button>
                  {resendStatus && (
                    <p className="text-xs text-primary font-medium">{resendStatus}</p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                data-testid="welcome-signin-submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Bottom link: New here? Get started */}
            <div className="pt-2 text-center text-xs text-muted-foreground">
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setViewMode("signup");
                  router.push("/welcome?mode=signup");
                }}
                className="font-semibold text-primary underline-offset-4 hover:underline cursor-pointer"
              >
                Get started
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: GET STARTED (SIGN UP) */}
        {viewMode === "signup" && (
          <div className="space-y-4">
            {/* Continue with Google */}
            <button
              type="button"
              data-testid="welcome-google"
              onClick={handleContinueWithGoogle}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 h-12 sm:h-[52px] rounded-[12px] border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-xs transition hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider "or" */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
                or
              </div>
            </div>

            {/* Sign-up Form */}
            <form onSubmit={handleSignUp} noValidate className="space-y-3.5 text-left">
              {/* First Name */}
              <div className="space-y-1">
                <label
                  htmlFor="welcome-first-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  First name
                </label>
                <input
                  id="welcome-first-name"
                  type="text"
                  data-testid="welcome-first-name-input"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: undefined }));
                  }}
                  placeholder="Your first name"
                  maxLength={30}
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                {fieldErrors.firstName && (
                  <p
                    data-testid="welcome-name-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="welcome-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="welcome-email"
                  type="email"
                  data-testid="welcome-email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                {fieldErrors.email && (
                  <p
                    data-testid="welcome-email-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password with Live Checklist */}
              <div className="space-y-1.5">
                <label
                  htmlFor="welcome-password"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="welcome-password"
                    type={showPassword ? "text" : "password"}
                    data-testid="welcome-password-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-11 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    data-testid="welcome-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Rules Live Checklist */}
                <PasswordRulesChecklist password={password} />

                {fieldErrors.password && (
                  <p
                    data-testid="welcome-password-error"
                    className="text-xs font-medium text-destructive px-1"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* General Error */}
              {generalError && (
                <p
                  data-testid="welcome-auth-error"
                  className="text-xs font-medium text-destructive px-1"
                >
                  {generalError}
                </p>
              )}

              {/* Submit button: Disabled until all 4 rules are met */}
              <button
                type="submit"
                data-testid="welcome-signup-submit"
                disabled={isLoading || !isPasswordValid(password) || !email || !firstName.trim()}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Create account</span>
                )}
              </button>
            </form>

            {/* Try without an account */}
            <div className="pt-2 text-center">
              <button
                type="button"
                data-testid="welcome-try-guest"
                onClick={handleTryWithoutAccount}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition cursor-pointer"
              >
                Try without an account
              </button>
            </div>

            {/* Bottom link: Already have an account? Sign in */}
            <div className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setViewMode("signin");
                  router.push("/welcome?mode=signin");
                }}
                className="font-semibold text-primary underline-offset-4 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: CHECK EMAIL (SIGN UP CONFIRMATION) */}
        {viewMode === "check-email" && (
          <div className="space-y-6 text-center">
            {/* Mail Icon in soft violet circle */}
            <div className="space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary shadow-xs">
                <MailCheck className="h-8 w-8" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent you a link to confirm your account to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </p>
            </div>

            {/* Resend section with 60-second countdown */}
            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive it? Check your spam folder or resend the link below.
              </p>
              <button
                type="button"
                data-testid="auth-resend-button"
                onClick={handleResendConfirmation}
                disabled={resendCountdown > 0 || isResending}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>
                  {resendCountdown > 0
                    ? `Resend (${resendCountdown}s)`
                    : "Resend confirmation email"}
                </span>
              </button>
              {resendStatus && (
                <p className="text-xs text-primary font-medium">{resendStatus}</p>
              )}
            </div>

            {/* Actions: Use a different email & Already have an account? Sign in */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setViewMode("signup");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Use a different email</span>
              </button>
              {(existingAccountNotice || true) && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setViewMode("signin");
                      router.push("/welcome?mode=signin");
                    }}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: FORGOT PASSWORD */}
        {viewMode === "forgot" && (
          <div className="space-y-4">
            <form onSubmit={handleForgotPassword} noValidate className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label
                  htmlFor="welcome-forgot-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="welcome-forgot-email"
                  type="email"
                  data-testid="welcome-forgot-email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="name@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                {fieldErrors.email && (
                  <p className="text-xs font-medium text-destructive px-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {generalError && (
                <p className="text-xs font-medium text-destructive px-1">
                  {generalError}
                </p>
              )}

              <button
                type="submit"
                data-testid="welcome-forgot-submit"
                disabled={isLoading || !email.trim()}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setViewMode("signin");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: RESET LINK SENT */}
        {viewMode === "reset-sent" && (
          <div className="space-y-6 text-center">
            <div className="space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary shadow-xs">
                <MailCheck className="h-8 w-8" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for{" "}
                <span className="font-semibold text-foreground">{email}</span>, we&apos;ve sent a reset link.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get the link? Wait for the timer to finish before requesting another.
              </p>
              <button
                type="button"
                onClick={handleResendPasswordReset}
                disabled={resendCountdown > 0 || isResending}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>
                  {resendCountdown > 0
                    ? `Resend (${resendCountdown}s)`
                    : "Resend reset link"}
                </span>
              </button>
              {resendStatus && (
                <p className="text-xs text-primary font-medium">{resendStatus}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setViewMode("signin");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 6: SET NEW PASSWORD */}
        {viewMode === "reset" && (
          <div className="space-y-4">
            <form onSubmit={handleSaveNewPassword} noValidate className="space-y-3.5 text-left">
              <div className="space-y-1.5">
                <label
                  htmlFor="welcome-reset-password"
                  className="text-xs font-medium text-muted-foreground"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="welcome-reset-password"
                    type={showPassword ? "text" : "password"}
                    data-testid="welcome-reset-password-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Enter your new password"
                    autoFocus
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-11 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    data-testid="welcome-reset-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <PasswordRulesChecklist password={password} />

                {fieldErrors.password && (
                  <p className="text-xs font-medium text-destructive px-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {generalError && (
                <p
                  data-testid="welcome-reset-error"
                  className="text-xs font-medium text-destructive px-1"
                >
                  {generalError}
                </p>
              )}

              <button
                type="submit"
                data-testid="welcome-reset-submit"
                disabled={isLoading || !isPasswordValid(password)}
                className="flex w-full items-center justify-center gap-2 h-12 sm:h-[52px] rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Save password</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <React.Suspense fallback={null}>
      <WelcomeContent />
    </React.Suspense>
  );
}
