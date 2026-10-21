import { toast } from "sonner";

// Extend Window interface for BeforeInstallPromptEvent
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global state for PWA install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function setDeferredPrompt(prompt: BeforeInstallPromptEvent | null) {
  deferredPrompt = prompt;
  installListeners.forEach((listener) => listener());
}

export function subscribeInstallPrompt(callback: () => void): () => void {
  installListeners.add(callback);
  return () => {
    installListeners.delete(callback);
  };
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS standalone
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isFormActive(): boolean {
  if (typeof window === "undefined") return false;
  const pathname = window.location.pathname;
  if (pathname.startsWith("/new/") || pathname.endsWith("/edit")) {
    return true;
  }
  // Check if a modal/dialog/drawer is currently open
  return Boolean(document.querySelector('[role="dialog"], [data-vaul-drawer="true"]'));
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      return true;
    }
  } catch (err) {
    console.error("PWA install error:", err);
  }
  return false;
}

/**
 * Registers the Service Worker and listens for version updates.
 * PRD section 8: "When a new version is ready, show 'Update available' with a Reload button;
 * never reload on its own while a form is open."
 */
export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Capture install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  });

  window.addEventListener("appinstalled", () => {
    setDeferredPrompt(null);
  });

  // Register sw.js
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      // If a service worker is already waiting to activate
      if (registration.waiting) {
        notifyUpdateAvailable(registration.waiting);
      }

      // Listen for newly discovered updates
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdateAvailable(installingWorker);
          }
        });
      });
    })
    .catch((err) => {
      // Ignore registration errors during local dev or unsupported modes
      if (process.env.NODE_ENV !== "development") {
        console.error("Service worker registration failed:", err);
      }
    });

  // Only reload on controllerchange if there was an existing controller (i.e. this is an update, not first install)
  const hasInitialController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hasInitialController) return;
    if (refreshing) return;
    refreshing = true;
    // Never auto-reload while a form is open (PRD section 8)
    if (!isFormActive()) {
      window.location.reload();
    }
  });
}

let updateToastShown = false;

function notifyUpdateAvailable(worker: ServiceWorker) {
  if (updateToastShown) return;
  updateToastShown = true;

  toast("New version available", {
    description: "An update is ready with the latest improvements.",
    duration: Infinity,
    action: {
      label: "Reload",
      onClick: () => {
        // Never auto-reload if form is active; prompt or execute safely
        worker.postMessage({ type: "SKIP_WAITING" });
        // Force reload if controllerchange does not fire immediately
        setTimeout(() => {
          if (!isFormActive()) {
            window.location.reload();
          }
        }, 300);
      },
    },
  });
}
