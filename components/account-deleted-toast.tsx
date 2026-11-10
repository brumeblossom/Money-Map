"use client";

import * as React from "react";
import { toast } from "sonner";

export function AccountDeletedToast() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("deleted") === "1") {
      toast.success("Your account has been deleted.");
      url.searchParams.delete("deleted");
      const cleanUrl = url.pathname + (url.search ? url.search : "") + url.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  return null;
}
