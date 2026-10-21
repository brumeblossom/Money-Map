"use client";

import * as React from "react";
import { registerPwaServiceWorker } from "@/lib/pwa";

export function PwaManager() {
  React.useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  return null;
}
