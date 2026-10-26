"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Home,
  Settings,
} from "lucide-react";
import { BrandLogoMark } from "@/components/brand-logo";
import { useProfile } from "@/lib/repo/hooks";
import { cn } from "cn";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Records", href: "/records", icon: FileText },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const profile = useProfile();
  const [authUser, setAuthUser] = React.useState<{ email: string; fallbackName?: string } | null>(null);

  React.useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function checkUser() {
      try {
        if (typeof document !== "undefined") {
          const match = document.cookie.match(/moneymap_mock_user=([^;]+)/);
          if (match) {
            setAuthUser({
              email: "test@example.com",
              fallbackName: "User",
            });
            return;
          }
        }

        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setAuthUser({
            email: sessionData.session.user.email || "",
            fallbackName: sessionData.session.user.user_metadata?.full_name || "User",
          });
        } else {
          setAuthUser(null);
        }

        const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setAuthUser({
              email: session.user.email || "",
              fallbackName: session.user.user_metadata?.full_name || "User",
            });
          } else {
            setAuthUser(null);
          }
        });
        subscription = authSub.subscription;
      } catch {
        setAuthUser(null);
      }
    }

    checkUser();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const user = React.useMemo(() => {
    if (!authUser) return null;
    return {
      name: profile?.display_name?.trim() || authUser.fallbackName || "User",
      email: authUser.email,
    };
  }, [authUser, profile?.display_name]);

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[240px] lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:text-sidebar-foreground",
        className,
      )}
    >
      {/* Top Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <BrandLogoMark size="md" />
        <span className="text-base font-extrabold tracking-tight text-sidebar-foreground">
          Money Map
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
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
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors select-none",
                isActive
                  ? "bg-sidebar-accent text-white font-semibold"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-white" : "text-sidebar-muted",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Area: no avatar/user icon; show name and email or Guest · Sign in to back up */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/settings"
          data-testid="sidebar-settings-link"
          className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50"
        >
          <div className="flex min-w-0 flex-1 flex-col text-left pr-2">
            {user ? (
              <>
                <span className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-sidebar-muted">
                  {user.email}
                </span>
              </>
            ) : (
              <span className="truncate text-xs font-medium text-sidebar-muted hover:text-sidebar-foreground">
                Guest · Sign in to back up
              </span>
            )}
          </div>
          <Settings className="size-4 text-sidebar-muted shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
