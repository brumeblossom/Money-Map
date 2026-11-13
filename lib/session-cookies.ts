/**
 * Single source of truth for session cookies and authentication state detection.
 * Used by middleware.ts, app/page.tsx, and components/app-shell.tsx.
 */

export const SESSION_HEADER_NAME = "x-moneyrails-has-session";
export const GUEST_HEADER_NAME = "x-moneyrails-is-guest";
export const USER_HEADER_NAME = "x-moneyrails-is-user";

/**
 * Checks if a cookie name is a legitimate Supabase authentication session token.
 * Matches:
 *   sb-<projectRef>-auth-token
 *   sb-<projectRef>-auth-token.<index> (chunked)
 *
 * CRITICAL:
 *   Must NEVER match sb-<projectRef>-auth-token-code-verifier or code-challenge,
 *   which are PKCE flow initialization cookies set before a user has authenticated.
 */
export function isSupabaseSessionCookieName(name: string): boolean {
  if (!name || typeof name !== "string") return false;

  // Explicitly reject verifier and challenge cookies
  if (name.includes("-code-verifier") || name.includes("-code-challenge")) {
    return false;
  }

  // Matches sb-<ref>-auth-token or sb-<ref>-auth-token.0 / sb-<ref>-auth-token.1
  return /^sb-[a-zA-Z0-9_-]+-auth-token(\.\d+)?$/.test(name);
}

/**
 * Checks if a cookie name/value indicates an active guest mode.
 */
export function isGuestCookie(name: string, value?: string): boolean {
  if (name === "moneymap_guest") {
    return value === undefined || value === "true";
  }
  if (name === "mm_guest") {
    return value === undefined || value === "1";
  }
  return false;
}

/**
 * Checks if a cookie is a mock test user cookie.
 */
export function isMockUserCookie(name: string, value?: string): boolean {
  if (name !== "moneymap_mock_user") return false;
  return value === undefined || (value.trim().length > 0 && value !== '""');
}

/**
 * Evaluates whether an iterable of cookies contains a real Supabase session.
 * Excludes empty string, empty array, or verifier cookies.
 */
export function hasSupabaseSessionCookie(
  cookies: Iterable<{ name: string; value?: string }>
): boolean {
  for (const c of cookies) {
    if (isSupabaseSessionCookieName(c.name)) {
      if (c.value === undefined) return true;
      const val = c.value.trim();
      if (val && val !== '""' && val !== "[]" && val !== "{}") {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks whether an iterable of cookies represents an active session (user or guest).
 */
export function hasSessionFromCookies(
  cookies: Iterable<{ name: string; value?: string }>
): boolean {
  let isGuest = false;
  let hasUser = false;

  for (const c of cookies) {
    if (isGuestCookie(c.name, c.value)) {
      isGuest = true;
    }
    if (isMockUserCookie(c.name, c.value)) {
      hasUser = true;
    }
    if (isSupabaseSessionCookieName(c.name)) {
      const val = c.value?.trim();
      if (val && val !== '""' && val !== "[]" && val !== "{}") {
        hasUser = true;
      }
    }
  }

  return isGuest || hasUser;
}

/**
 * Parses client-side `document.cookie` string into key-value map.
 */
export function parseClientCookies(cookieString: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieString) return map;

  const pairs = cookieString.split(";");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      map.set(trimmed, "");
    } else {
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      map.set(key, val);
    }
  }
  return map;
}

/**
 * Determines session state from client document.cookie.
 */
export function getClientSessionState(cookieString: string): {
  hasSession: boolean;
  isGuest: boolean;
  isUser: boolean;
} {
  const map = parseClientCookies(cookieString);

  const isGuest =
    map.get("moneymap_guest") === "true" ||
    map.get("mm_guest") === "1";

  const hasMock = Boolean(map.get("moneymap_mock_user")?.trim());

  let hasSbSession = false;
  for (const [name, val] of map.entries()) {
    if (isSupabaseSessionCookieName(name)) {
      const trimmed = val.trim();
      if (trimmed && trimmed !== '""' && trimmed !== "[]" && trimmed !== "{}") {
        hasSbSession = true;
        break;
      }
    }
  }

  const isUser = hasMock || hasSbSession;
  const hasSession = isGuest || isUser;

  return { hasSession, isGuest, isUser };
}
