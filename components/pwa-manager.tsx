"use client";

import * as React from "react";
import { registerPwaServiceWorker } from "@/lib/pwa";

export function PwaManager() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => registerPwaServiceWorker());
      } else {
        setTimeout(() => registerPwaServiceWorker(), 1500);
      }
    }
  }, []);

  return null;
}
