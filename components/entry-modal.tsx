"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EntryForm } from "@/components/entry-form";

export interface EntryModalProps {
  action: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

function subscribeToMediaQuery(callback: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getServerSnapshot() {
  return false;
}

export function EntryModal({
  action,
  open,
  onOpenChange,
  currency = "NGN",
}: EntryModalProps) {
  const isDesktop = React.useSyncExternalStore(
    subscribeToMediaQuery,
    getDesktopSnapshot,
    getServerSnapshot,
  );

  const handleClose = () => {
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden sm:max-w-lg rounded-2xl">
          <DialogTitle className="sr-only">Entry form</DialogTitle>
          <EntryForm action={action} onClose={handleClose} currency={currency} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <DrawerTitle className="sr-only">Entry form</DrawerTitle>
        <EntryForm action={action} onClose={handleClose} currency={currency} />
      </DrawerContent>
    </Drawer>
  );
}
