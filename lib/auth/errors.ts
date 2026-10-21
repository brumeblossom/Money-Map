export const AUTH_ERROR_MESSAGES = {
  EXPIRED_LINK:
    "This sign-in link has expired or was already used. Ask for a new one.",
  OTHER_BROWSER:
    "Open the sign-in link in the same browser where you asked for it, or continue with Google.",
  DEFAULT_ERROR: "We couldn't sign you in. Please try again.",
  RATE_LIMIT:
    "Too many emails sent. Please wait a few minutes and try again, or continue with Google.",
  GOOGLE_DISABLED: "Google sign-in isn't ready yet. Use email for now.",
  INVALID_EMAIL: "Enter a valid email",
} as const;

/**
 * Maps query param reason from /auth/error?reason=... to plain-English message.
 */
export function getAuthErrorPageMessage(reason?: string | null): string {
  if (!reason) return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;

  const normalized = reason.toLowerCase();
  if (
    normalized === "expired" ||
    normalized.includes("expire") ||
    normalized.includes("already") ||
    normalized.includes("used") ||
    normalized.includes("otp") ||
    normalized.includes("invalid") ||
    normalized.includes("bad_token")
  ) {
    return AUTH_ERROR_MESSAGES.EXPIRED_LINK;
  }

  if (
    normalized === "other_browser" ||
    normalized.includes("browser") ||
    normalized.includes("pkce") ||
    normalized.includes("verifier")
  ) {
    return AUTH_ERROR_MESSAGES.OTHER_BROWSER;
  }

  return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
}

/**
 * Maps Supabase and auth runtime errors to user-friendly messages for /welcome and /auth/check-email.
 * Never shows raw JSON or technical error codes.
 */
export function mapAuthErrorMessage(error: unknown): string {
  if (!error) return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;

  let message = "";
  let status = "";

  if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    message = typeof errObj.message === "string" ? errObj.message : "";
    status = String(errObj.status || errObj.code || "");
  }

  const combined = `${message} ${status}`.toLowerCase();

  // 1. Rate limit exceeded (status 429 or Supabase error message)
  if (
    status === "429" ||
    combined.includes("rate limit") ||
    combined.includes("over_email_send_rate_limit") ||
    combined.includes("email rate limit exceeded") ||
    combined.includes("too many emails") ||
    combined.includes("for security purposes") ||
    combined.includes("only request this once")
  ) {
    return AUTH_ERROR_MESSAGES.RATE_LIMIT;
  }

  // 2. Google provider not enabled
  if (
    combined.includes("provider is not enabled") ||
    combined.includes("provider_disabled") ||
    combined.includes("unsupported provider") ||
    combined.includes("not enabled")
  ) {
    return AUTH_ERROR_MESSAGES.GOOGLE_DISABLED;
  }

  // 3. Invalid email address
  if (
    combined.includes("enter a valid email") ||
    combined.includes("invalid email") ||
    combined.includes("valid email") ||
    combined.includes("validate email") ||
    combined.includes("email address is invalid")
  ) {
    return AUTH_ERROR_MESSAGES.INVALID_EMAIL;
  }

  return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
}
