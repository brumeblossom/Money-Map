"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Validates that a string is a safe, relative, internal application URL.
 * Prevents open redirects, protocol smuggling, and double-slash bypasses.
 */
export function sanitizeInternalUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  // Must start with a single slash, not double slash, and not contain backslashes
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }

  // Reject URLs containing protocol specifiers before a slash or question mark
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  try {
    const dummy = new URL(trimmed, "http://localhost");
    // Ensure origin didn't change and pathname remains internal
    if (dummy.origin !== "http://localhost") return null;
    return `${dummy.pathname}${dummy.search}${dummy.hash}`;
  } catch {
    return null;
  }
}

/**
 * Maps a destination URL to its user-facing back-link label.
 * Allowed labels per PRD: "Records", "Entry", "Home", "Money I lent", "Insights", "Settings".
 */
export function getBackLinkText(url: string | null | undefined): string {
  const sanitized = sanitizeInternalUrl(url) || "/";
  const [pathname, search] = sanitized.split("?");
  const params = new URLSearchParams(search || "");

  if (pathname === "/" || pathname === "") {
    return "Home";
  }

  // Check /records/ sub-paths before /records
  if (pathname.startsWith("/records/")) {
    return "Entry";
  }

  if (pathname === "/records") {
    if (params.get("tab") === "lent") {
      return "Money I lent";
    }
    return "Records";
  }

  if (pathname === "/lent" || pathname.startsWith("/lent/")) {
    return "Money I lent";
  }

  if (pathname.startsWith("/insights")) {
    return "Insights";
  }

  if (pathname.startsWith("/settings")) {
    return "Settings";
  }

  return "Home";
}

/**
 * Appends the current screen path as a "from" query parameter to a target URL.
 */
export function createReturnUrl(targetUrl: string, currentUrl: string): string {
  const validCurrent = sanitizeInternalUrl(currentUrl);
  if (!validCurrent) return targetUrl;

  const [path, search] = targetUrl.split("?");
  const params = new URLSearchParams(search || "");
  params.set("from", validCurrent);
  return `${path}?${params.toString()}`;
}

/**
 * Hook to retrieve and sanitize the `from` query param, falling back to a sensible default.
 */
export function useReturnTo(defaultUrl: string): string {
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get("from");
  const sanitized = sanitizeInternalUrl(fromParam);
  return sanitized ?? defaultUrl;
}

/**
 * Hook to retrieve the current full path including search query.
 */
export function useCurrentUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  return search ? `${pathname}?${search}` : pathname;
}
