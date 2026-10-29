"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Globe, Trash2, Mail, Pencil, Shield } from "lucide-react";
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
import { InstallPwaCard } from "@/components/install-pwa-card";
import { displayNameSchema } from "@/lib/schemas";

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
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  // Check auth session for email & guest status
  React.useEffect(() => {
    async function checkAuth() {
      try {
        if (typeof document !== "undefined") {
          const hasAdminCookie =
            document.cookie.includes("moneymap_is_admin=1") ||
            document.cookie.includes("moneymap_mock_admin=1");
          if (hasAdminCookie) {
            setIsAdmin(true);
          }

          if (document.cookie.match(/moneymap_mock_user=([^;]+)/)) {
            setUserEmail("user@example.com");
            setIsGuest(false);
            return;
          }
        }

        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUserEmail(data.session.user.email ?? "user@example.com");
          setIsGuest(false);
          fetch("/api/admin/check")
            .then((res) => setIsAdmin(res.status === 200))
            .catch(() => setIsAdmin(false));
        } else {
          setIsGuest(true);
          setIsAdmin(false);
        }
      } catch (e) {
        console.error("Auth check error in settings", e);
        setIsGuest(true);
        setIsAdmin(false);
      }
    }
    checkAuth();
  }, []);

  // Edit name modal state
  const [showEditNameModal, setShowEditNameModal] = React.useState(false);
  const [editNameInput, setEditNameInput] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);

  const handleOpenEditName = () => {
    setEditNameInput(profile?.display_name?.trim() || "");
    setShowEditNameModal(true);
  };

  const handleSaveNameModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editNameInput.trim();
    const parsed = displayNameSchema.safeParse(trimmed);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Name must be between 1 and 30 characters");
      return;
    }
    const userId = getCurrentUserId() || profile?.user_id;
    if (!userId || isGuest) return;

    try {
      setIsSavingName(true);
      if (profile) {
        await updateProfile(userId, { display_name: parsed.data });
      } else {
        await createProfile({ user_id: userId, display_name: parsed.data, currency: "NGN" });
      }
      setShowEditNameModal(false);
      toast.success("Name updated");
    } catch (err) {
      console.error("Failed to save name", err);
      toast.error("Failed to update name");
    } finally {
      setIsSavingName(false);
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
      }
      router.replace("/welcome");
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error("Failed to delete account. Please try again.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, currency, categories, repeating entries, appearance, and account settings.
        </p>
      </div>

      {/* 1. PROFILE Section */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
          Profile
        </span>
        <div id="profile" className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          {/* Display Name (text with edit icon button) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Display name
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-input bg-background px-4 py-2.5">
              <span
                data-testid="settings-name-display"
                className="text-sm font-medium text-foreground truncate"
              >
                {isGuest
                  ? "Guest"
                  : profile?.display_name?.trim() || "No name set"}
              </span>
              {!isGuest && (
                <button
                  type="button"
                  onClick={handleOpenEditName}
                  data-testid="settings-edit-name-btn"
                  aria-label="Edit name"
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
                >
                  <Pencil className="size-4" />
                </button>
              )}
            </div>
            {isGuest && (
              <p className="text-[11px] text-muted-foreground">
                Sign in to add your name and back up your data.
              </p>
            )}
          </div>

          {/* Email (read only) */}
          <div className="space-y-1.5 pt-4 border-t border-border">
            <label
              htmlFor="settings-email-input"
              className="text-xs font-semibold text-foreground"
            >
              Email
            </label>
            <input
              id="settings-email-input"
              type="email"
              data-testid="settings-email-input"
              value={isGuest ? "Not signed in" : (userEmail ?? "")}
              readOnly
              disabled
              className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed select-none"
            />
          </div>

          {/* Currency */}
          <CurrencyPickerSettings embedded />
        </div>
      </div>

      {/* 2. YOUR DATA Section */}
      <div className="space-y-2.5 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
          Your Data
        </span>
        <div className="space-y-4">
          {/* Categories Card (max 5 with See all link) */}
          <CategoriesSettings limit={5} />

          {/* Repeating entries Card (max 5 with See all link) */}
          <div id="repeating-entries" className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">Repeating entries</h3>
                <Link
                  href="/settings/repeating"
                  data-testid="settings-repeating-entries-link"
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  See all
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage reminders for weekly and monthly recurring entries.
              </p>
            </div>

            <RecurringRulesList limit={5} />
          </div>
        </div>
      </div>

      {/* 3. APPEARANCE Section */}
      <div className="space-y-2.5 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
          Appearance
        </span>
        <div id="appearance" className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">Theme</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose how Money Map looks to you.
            </p>

            <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-muted p-1 sm:w-80">
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

          {/* Add to Home Screen help */}
          <InstallPwaCard embedded />
        </div>
      </div>

      {/* 4. ACCOUNT Section */}
      <div className="space-y-2.5 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
          Account
        </span>
        <div id="account" className="rounded-xl border border-border bg-card p-5 shadow-xs">
          {isGuest ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Guest</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Guest · Sign in to back up
                </p>
              </div>
              <Link
                href="/welcome?intent=signin"
                data-testid="settings-guest-signin-link"
                className="inline-flex w-full sm:w-[240px] h-11 items-center justify-start rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition cursor-pointer"
              >
                Sign in to add your name and back up your data
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Account</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Manage your signed-in account and device sessions.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {/* Sign out */}
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  data-testid="settings-signout-btn"
                  className="flex w-full sm:w-[240px] h-11 items-center justify-start gap-2.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span>Sign out</span>
                </button>

                {/* Sign out of all devices */}
                <button
                  type="button"
                  onClick={() => setShowSignOutAllConfirm(true)}
                  data-testid="settings-signout-all-btn"
                  className="flex w-full sm:w-[240px] h-11 items-center justify-start gap-2.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                >
                  <Globe className="size-4 shrink-0" />
                  <span>Sign out of all devices</span>
                </button>

                {/* Divider with about 32px of space above it */}
                <div className="mt-8 pt-4 border-t border-border">
                  {/* Delete account */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText("");
                      setShowDeleteAccountModal(true);
                    }}
                    data-testid="settings-delete-account-btn"
                    className="flex w-full sm:w-[240px] h-11 items-center justify-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 cursor-pointer text-left"
                  >
                    <Trash2 className="size-4 shrink-0" />
                    <span>Delete account</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phone Admin Link */}
      {isAdmin && (
        <div className="lg:hidden px-1 pt-2">
          <Link
            href="/admin"
            data-testid="settings-admin-link"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted"
          >
            <Shield className="size-3.5 text-primary" />
            <span>Admin Dashboard</span>
          </Link>
        </div>
      )}

      {/* Footer row: Money Map v1 on left, Send feedback on right */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground pt-4">
        <span data-testid="app-version">Money Map v1</span>
        <a
          href="mailto:workwithbrume@gmail.com?subject=Money%20Map%20feedback"
          data-testid="send-feedback-link"
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium cursor-pointer"
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

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Edit name
            </h3>
            <form onSubmit={handleSaveNameModal} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="modal-name-input"
                    className="text-xs font-semibold text-foreground"
                  >
                    Name
                  </label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {editNameInput.length}/30
                  </span>
                </div>
                <input
                  id="modal-name-input"
                  type="text"
                  data-testid="modal-name-input"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="Your name"
                  maxLength={30}
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={() => setShowEditNameModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName || !editNameInput.trim()}
                  data-testid="modal-save-name-btn"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSavingName ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
