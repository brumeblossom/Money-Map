"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Check, Globe, Trash2, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { signOut, signOutAllDevices } from "@/lib/sync";
import { useProfile } from "@/lib/repo/hooks";
import { updateProfile, createProfile } from "@/lib/repo";
import { getCurrentUserId } from "@/lib/repo/user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CurrencyPickerSettings } from "@/components/currency-picker-settings";
import { CategoriesSettings } from "@/components/categories-settings";
import { RecurringRulesList } from "@/components/recurring-rules-list";
import { ShareLinksList } from "@/components/share-links-list";
import { InstallPwaCard } from "@/components/install-pwa-card";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Dialog & modal states
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showSignOutAllConfirm, setShowSignOutAllConfirm] = React.useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  // User state
  const profile = useProfile();
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [isGuest, setIsGuest] = React.useState<boolean>(true);

  // Display Name edit & autosave state
  const [nameValue, setNameValue] = React.useState<string>("");
  const [prevProfileDisplayName, setPrevProfileDisplayName] = React.useState<string | null | undefined>(undefined);
  const [isSavedTickVisible, setIsSavedTickVisible] = React.useState(false);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  if (profile?.display_name !== undefined && profile.display_name !== prevProfileDisplayName) {
    setPrevProfileDisplayName(profile.display_name);
    setNameValue(profile.display_name ?? "");
  }

  // Check auth session for email & guest status
  React.useEffect(() => {
    async function checkAuth() {
      try {
        if (typeof document !== "undefined" && document.cookie.match(/moneymap_mock_user=([^;]+)/)) {
          setUserEmail("user@example.com");
          setIsGuest(false);
          return;
        }

        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUserEmail(data.session.user.email ?? "user@example.com");
          setIsGuest(false);
        } else {
          setIsGuest(true);
        }
      } catch (e) {
        console.error("Auth check error in settings", e);
        setIsGuest(true);
      }
    }
    checkAuth();
  }, []);

  const saveName = React.useCallback(
    async (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed.length > 60) return;
      const userId = getCurrentUserId() || profile?.user_id;
      if (!userId || isGuest) return;

      try {
        if (profile) {
          await updateProfile(userId, { display_name: trimmed });
        } else {
          await createProfile({ user_id: userId, display_name: trimmed, currency: "NGN" });
        }
        setIsSavedTickVisible(true);
        setTimeout(() => setIsSavedTickVisible(false), 2500);
      } catch (err) {
        console.error("Failed to auto-save name in settings", err);
      }
    },
    [profile, isGuest],
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameValue(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveName(val);
    }, 600);
  };

  const handleNameBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    saveName(nameValue);
  };

  const handleToggleEmailReminders = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    const userId = getCurrentUserId() || profile?.user_id || "guest";
    try {
      if (profile) {
        await updateProfile(profile.user_id, { notifications_enabled: enabled });
      } else {
        await createProfile({ user_id: userId, notifications_enabled: enabled });
      }
      toast.success(enabled ? "Daily email reminders enabled" : "Daily email reminders disabled");
    } catch (err) {
      console.error("Failed to update reminder settings", err);
      toast.error("Failed to update reminder settings");
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

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    try {
      await signOutAllDevices(db, router);
    } catch (e) {
      console.error("Global sign out error:", e);
      setIsSigningOutAll(false);
      setShowSignOutAllConfirm(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Type "DELETE" exactly to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete account");
      }

      // Clear local Dexie database
      await Promise.all([
        db.entries.clear(),
        db.loans.clear(),
        db.loan_payments.clear(),
        db.categories.clear(),
        db.recurring_rules.clear(),
        db.profiles.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ]);

      // Sign out auth client locally & clear storage
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});

      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/welcome";
      } else {
        router.replace("/welcome");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error("Failed to delete account. Please try again.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, currency, categories, repeating entries, notifications, and account settings.
        </p>
      </div>

      {/* 1. Profile Section */}
      <div id="profile" className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-base font-semibold text-foreground">Profile</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Your display name is shown in the header and on reports and shared links.
        </p>

        <div className="mt-4 pt-4 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="settings-name-input"
              className="text-xs font-semibold text-foreground"
            >
              Display name
            </label>
            {isSavedTickVisible && (
              <span
                data-testid="name-saved-indicator"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in"
              >
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>
          <input
            id="settings-name-input"
            type="text"
            data-testid="settings-name-input"
            value={nameValue}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            disabled={isGuest}
            placeholder={isGuest ? "Sign in to set your name" : "Your name"}
            maxLength={60}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isGuest && (
            <p className="text-[11px] text-muted-foreground">
              Sign in to add your name and back up your data.
            </p>
          )}
        </div>
      </div>

      {/* 2. Currency Section */}
      <CurrencyPickerSettings />

      {/* 3. Categories Section */}
      <CategoriesSettings />

      {/* 4. Repeating Entries Section */}
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

      {/* 4. Share Links Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">Share links</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage your active public links.
            </p>
          </div>
          <Link
            href="/export"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Create link
          </Link>
        </div>
        <div className="mt-3">
          <ShareLinksList />
        </div>
      </div>

      {/* 4. Reminders Section */}
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

      {/* Appearance Section */}
      <div id="appearance" className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-base font-semibold text-foreground">Appearance</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how Money Map looks to you.
        </p>

        <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-muted p-1 sm:w-80">
          <button
            type="button"
            data-testid="theme-light-btn"
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
              theme === "light"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Light
          </button>
          <button
            type="button"
            data-testid="theme-dark-btn"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
              theme === "dark"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Dark
          </button>
          <button
            type="button"
            data-testid="theme-system-btn"
            onClick={() => setTheme("system")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
              theme === "system"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            System
          </button>
        </div>
      </div>

      {/* Install App Section */}
      <InstallPwaCard />

      {/* 5. Account Section */}
      <div id="account" className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-base font-semibold text-foreground">Account</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {isGuest
            ? "You are currently using Money Map as a Guest."
            : "Manage your signed-in account and device sessions."}
        </p>

        {isGuest ? (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <span
                data-testid="account-status-badge"
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
              >
                Guest
              </span>
            </div>

            <Link
              href="/welcome?intent=signin"
              data-testid="settings-guest-signin-link"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              Sign in to add your name and back up your data
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4 pt-4 border-t border-border">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="settings-email-input"
                className="text-xs font-semibold text-foreground"
              >
                Signed-in email
              </label>
              <input
                id="settings-email-input"
                type="email"
                data-testid="settings-email-input"
                value={userEmail ?? ""}
                readOnly
                disabled
                className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Your sign-in email cannot be changed.
              </p>
            </div>

            {/* Session actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                data-testid="settings-signout-btn"
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSignOutAllConfirm(true)}
                data-testid="settings-signout-all-btn"
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Globe className="size-4" />
                <span>Sign out of all devices</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText("");
                  setShowDeleteAccountModal(true);
                }}
                data-testid="settings-delete-account-btn"
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 cursor-pointer ml-auto"
              >
                <Trash2 className="size-4" />
                <span>Delete account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. App Version and Feedback */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span data-testid="app-version">Money Map v0.1.0</span>
        <a
          href="mailto:feedback@moneymap.app?subject=Money%20Map%20Feedback"
          data-testid="send-feedback-link"
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
        >
          <Mail className="size-3.5" />
          <span>Send feedback</span>
        </a>
      </div>

      {/* Confirmation Dialog: Sign out of this device */}
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
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                data-testid="confirm-signout-btn"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Sign out of all devices */}
      {showSignOutAllConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Sign out of all devices?
            </h3>
            <p className="text-sm text-muted-foreground">
              This will sign you out of Money Map on every phone, tablet, and computer you&apos;ve signed in on.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSigningOutAll}
                onClick={() => setShowSignOutAllConfirm(false)}
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOutAll}
                onClick={handleSignOutAll}
                data-testid="confirm-signout-all-btn"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                {isSigningOutAll ? "Signing out..." : "Sign out of all devices"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Account */}
      {showDeleteAccountModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-destructive">
                Delete account?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                This action is irreversible. All your transactions, loans, categories, recurring entries, and settings will be permanently deleted from Money Map servers and this device.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label
                htmlFor="delete-confirm-input"
                className="text-xs font-semibold text-foreground"
              >
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                data-testid="delete-confirm-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-mono text-foreground focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                onClick={handleDeleteAccount}
                data-testid="confirm-delete-account-btn"
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAccount ? "Deleting account..." : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
