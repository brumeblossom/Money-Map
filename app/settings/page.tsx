"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { signOut } from "@/lib/sync";

import Link from "next/link";
import { toast } from "sonner";
import { InstallPwaCard } from "@/components/install-pwa-card";
import { RecurringRulesList } from "@/components/recurring-rules-list";
import { useProfile } from "@/lib/repo/hooks";
import { updateProfile, createProfile } from "@/lib/repo";
import { getCurrentUserId } from "@/lib/repo/user";

export default function SettingsPage() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const profile = useProfile();

  const handleToggleEmailReminders = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    const userId = getCurrentUserId() || profile?.user_id || "guest";
    try {
      if (profile) {
        await updateProfile(profile.user_id, { notifications_enabled: enabled });
      } else {
        await createProfile({ user_id: userId, notifications_enabled: enabled });
      }
      toast(enabled ? "Daily email reminders enabled" : "Daily email reminders disabled");
    } catch (err) {
      console.error("Failed to update reminder settings", err);
      toast("Failed to update settings. Please try again.");
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(db, router);
    } catch (e) {
      console.error("Sign out error:", e);
      setIsSigningOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name, currency, manage categories, repeating entries, share links, notifications, sign in or sign out, delete account.
        </p>
      </div>

      {/* Repeating Entries Section (US-5.1 Prompt 14) */}
      <div id="repeating-entries" className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Repeating entries</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage reminders for weekly and monthly recurring entries.
            </p>
          </div>
          <Link
            href="/settings/repeating"
            data-testid="settings-repeating-entries-link"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage
          </Link>
        </div>

        <RecurringRulesList />
      </div>

      {/* Reminders Section (Prompt 15 / US-4.3 / US-5.1) */}
      <div id="reminders" className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-base font-semibold text-foreground">Reminders</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Receive daily notifications for due loans and repeating entries.
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <label
            htmlFor="email-reminders-toggle"
            className="text-sm font-medium text-foreground cursor-pointer select-none"
          >
            Email me a daily reminder
          </label>
          <input
            id="email-reminders-toggle"
            data-testid="email-reminders-switch"
            type="checkbox"
            checked={profile?.notifications_enabled ?? false}
            onChange={handleToggleEmailReminders}
            className="size-5 rounded border-border accent-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Add to Home Screen Section (Prompt 11 / US-10.1) */}
      <InstallPwaCard />

      {/* Account Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-base font-semibold text-foreground">Account</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign out of your account on this device.
        </p>

        <div className="mt-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            data-testid="settings-signout-btn"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog (PRD Section 3, US-1.4: "Sign out of this device?") */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Sign out of this device?
            </h3>
            <p className="text-sm text-muted-foreground">
              Your data is safely synced to your account. This will push any pending changes, clear local storage on this device, and return you to the welcome screen.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                data-testid="confirm-signout-btn"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
