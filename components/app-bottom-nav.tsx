"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { MAIN_NAV_ITEMS } from "@/components/app-sidebar";

export function AppBottomNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      data-testid="app-bottom-nav"
      aria-label="Main Navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden",
        className,
      )}
    >
      <div className="grid h-16 grid-cols-4 items-center">
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[48px] min-w-[44px] py-1 transition-colors select-none",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-secondary text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
              </div>
              <span className="text-[11px] leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
