"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppHeader } from "@/components/app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Routes that do not render the main app shell chrome (PRD section 2)
  const isNoChromeRoute =
    pathname.startsWith("/s/") ||
    pathname === "/welcome" ||
    pathname.startsWith("/auth/");

  if (isNoChromeRoute) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const isInsightsRoute = pathname.startsWith("/insights");

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
            isInsightsRoute
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
