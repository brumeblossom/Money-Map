"use client";

import * as React from "react";
import {
  CheckCircle2,
  Download,
  Share,
  PlusSquare,
  Smartphone,
  Info,
} from "lucide-react";
import {
  getDeferredPrompt,
  isIosDevice,
  isStandaloneMode,
  promptPwaInstall,
  subscribeInstallPrompt,
} from "@/lib/pwa";

export function InstallPwaCard({ embedded = false }: { embedded?: boolean } = {}) {
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [installSuccess, setInstallSuccess] = React.useState(false);

  const hasPrompt = React.useSyncExternalStore(
    subscribeInstallPrompt,
    () => Boolean(getDeferredPrompt()),
    () => false,
  );

  const standalone = React.useSyncExternalStore(
    () => () => {},
    isStandaloneMode,
    () => false,
  );

  const isIos = React.useSyncExternalStore(
    () => () => {},
    isIosDevice,
    () => false,
  );

  const installed = standalone || installSuccess;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const accepted = await promptPwaInstall();
      if (accepted) {
        setInstallSuccess(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      data-testid="pwa-install-card"
      className={
        embedded
          ? "pt-4 border-t border-border"
          : "rounded-xl border border-border bg-card p-5 shadow-xs"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Add to Home Screen
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Open Money Map in its own app window and use it when you have no internet.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {installed ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>Money Map is installed on this device</span>
          </div>
        ) : isIos ? (
          <div className="space-y-3" data-testid="ios-install-steps">
            <p className="text-sm font-medium text-foreground">
              To add to your iPhone or iPad:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none pl-0">
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <span>
                  Tap <span className="font-medium text-foreground">Share</span> (
                  <Share className="inline size-3.5 text-primary align-baseline" />
                  ) in Safari
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                <span>
                  Tap{" "}
                  <span className="font-medium text-foreground">
                    Add to Home Screen
                  </span>{" "}
                  (
                  <PlusSquare className="inline size-3.5 text-primary align-baseline" />
                  )
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            {hasPrompt ? (
              <div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  data-testid="pwa-install-button"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="size-4" />
                  <span>
                    {isInstalling ? "Installing..." : "Add to Home Screen"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                <span>
                  In Chrome or Edge, tap the browser menu (⋮) and select{" "}
                  <strong className="text-foreground font-medium">
                    &quot;Add to Home Screen&quot;
                  </strong>{" "}
                  or{" "}
                  <strong className="text-foreground font-medium">
                    &quot;Install app&quot;
                  </strong>
                  .
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
