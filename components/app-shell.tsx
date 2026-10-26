"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppHeader } from "@/components/app-header";
import { seedDefaultCategories, cleanupDuplicateCategories } from "@/lib/repo/seed";
import { initSync } from "@/lib/sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  React.useEffect(() => {
    seedDefaultCategories()
      .then(() => cleanupDuplicateCategories())
      .catch((err) => {
        console.error("Failed to seed/clean categories in AppShell", err);
      });
    const cleanupSync = initSync();
    return () => {
      cleanupSync();
    };
  }, []);

  // Routes that do not render the main app shell chrome (PRD section 2)
  const isNoChromeRoute =
    pathname.startsWith("/s/") ||
    pathname === "/welcome" ||
    pathname.startsWith("/auth/");

  if (isNoChromeRoute) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const isWideRoute =
    pathname === "/" ||
    pathname.startsWith("/new/") ||
    pathname.startsWith("/records") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/lent");

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
    </div>
  );
}
