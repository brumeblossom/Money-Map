"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import dynamic from "next/dynamic";

const AppSidebar = dynamic(() => import("@/components/app-sidebar").then((m) => m.AppSidebar), {
  ssr: false,
});
const AppBottomNav = dynamic(() => import("@/components/app-bottom-nav").then((m) => m.AppBottomNav), {
  ssr: false,
});
const AppHeader = dynamic(() => import("@/components/app-header").then((m) => m.AppHeader), {
  ssr: false,
});
const Toaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), {
  ssr: false,
});

function getSessionSnapshot(initial: boolean): boolean {
  if (typeof document === "undefined") return initial;
  const isGuest =
    document.cookie.includes("moneymap_guest=true") ||
    document.cookie.includes("mm_guest=1");
  const hasMock = document.cookie.includes("moneymap_mock_user=");
  const hasSessionCookie = document.cookie.includes("moneymap_has_session=1");
  const hasSb = document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("sb-") && c.includes("-auth-token="));
  return isGuest || hasMock || hasSessionCookie || hasSb;
}

function subscribeToSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("focus", callback);
  return () => window.removeEventListener("focus", callback);
}

export function AppShell({
  children,
  initialHasSession = false,
}: {
  children: React.ReactNode;
  initialHasSession?: boolean;
}) {
  const pathname = usePathname();
  const hasSession = React.useSyncExternalStore(
    subscribeToSession,
    () => getSessionSnapshot(initialHasSession),
    () => initialHasSession,
  );

  React.useEffect(() => {
    // Only init sync and default categories if signed in or guest
    if (!hasSession && pathname === "/") {
      return;
    }
    let cleanupSync: (() => void) | undefined;
    Promise.all([
      import("@/lib/repo/seed"),
      import("@/lib/sync"),
    ]).then(([{ seedDefaultCategories, cleanupDuplicateCategories }, { initSync }]) => {
      seedDefaultCategories()
        .then(() => cleanupDuplicateCategories())
        .catch((err) => {
          console.error("Failed to seed/clean categories in AppShell", err);
        });
      cleanupSync = initSync();
    });
    return () => {
      cleanupSync?.();
    };
  }, [hasSession, pathname]);

  // Routes that do not render the main app shell chrome (PRD section 2)
  const isLandingOnRoot = pathname === "/" && !hasSession;
  const isNoChromeRoute =
    isLandingOnRoot ||
    pathname.startsWith("/s/") ||
    pathname === "/welcome" ||
    pathname.startsWith("/auth/");

  if (isNoChromeRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
        {!isLandingOnRoot && <Toaster />}
      </div>
    );
  }

  const isWideRoute =
    pathname === "/" ||
    pathname.startsWith("/new/") ||
    pathname.startsWith("/records") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/lent") ||
    pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Desktop 240px Sidebar */}
      <AppSidebar />

      {/* Main Content Area offset by 240px on lg+ */}
      <div className="flex flex-1 flex-col lg:pl-[240px]">
        {/* Top Header with title and sync status */}
        <AppHeader />

        {/* Page Container */}
        <main
          className={cn(
            "flex-1 w-full px-4 py-6 pb-24 lg:pb-12",
            isWideRoute
              ? "max-w-[560px] lg:max-w-5xl mx-auto"
              : "max-w-[560px] mx-auto",
          )}
        >
          {children}
        </main>

        {/* Mobile/Tablet Bottom Navigation Bar (< 1024px) */}
        <AppBottomNav />
      </div>
      <Toaster />
    </div>
  );
}
