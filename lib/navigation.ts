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

/**
 * Resolves the destination URL for Back/Cancel/Save/Delete on entry detail and edit views.
 * If fromUrl was not passed or was passed as just "/records", derives the tab from entryKind:
 * income -> /records?tab=income, giving -> /records?tab=giving, expense -> /records?tab=expenses.
 */
export function resolveReturnUrl(fromUrl: string | null | undefined, entryKind?: string | null): string {
  const sanitized = sanitizeInternalUrl(fromUrl);
  const defaultTab =
    entryKind === "expense"
      ? "expenses"
      : entryKind === "giving"
        ? "giving"
        : entryKind === "income"
          ? "income"
          : "income";
  const fallbackUrl = `/records?tab=${defaultTab}`;

  if (!sanitized) {
    return fallbackUrl;
  }

  // If sanitized is just "/records" or "/records/" without query parameters
  if (sanitized === "/records" || sanitized === "/records/") {
    return fallbackUrl;
  }

  // If sanitized starts with "/records?", ensure it has a tab query parameter
  if (sanitized.startsWith("/records?")) {
    const [, search] = sanitized.split("?");
    const params = new URLSearchParams(search);
    if (!params.has("tab")) {
      params.set("tab", defaultTab);
      return `/records?${params.toString()}`;
    }
  }

  return sanitized;
}
