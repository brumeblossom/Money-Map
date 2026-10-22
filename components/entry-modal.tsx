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
import { useProfile } from "@/lib/repo/hooks";

export interface EntryModalProps {
  action: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  initialValues?: {
    amount_minor?: number;
    category_id?: string;
    counterparty?: string | null;
    description?: string | null;
    occurred_on?: string;
    repeats?: "No" | "Weekly" | "Monthly";
  };
  recurringRuleIdToAdvance?: string;
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
  initialValues,
  recurringRuleIdToAdvance,
}: EntryModalProps) {
  const profile = useProfile();
  const effectiveCurrency = profile?.currency || currency || "NGN";

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
        <DialogContent
          showCloseButton={false}
          className="w-[480px] max-w-[480px] sm:max-w-[480px] max-h-[min(640px,80vh)] h-[min(640px,80vh)] p-0 overflow-hidden rounded-2xl flex flex-col border border-border bg-background shadow-2xl"
        >
          <DialogTitle className="sr-only">Entry form</DialogTitle>
          <EntryForm
            key={action}
            action={action}
            initialValues={initialValues}
            recurringRuleIdToAdvance={recurringRuleIdToAdvance}
            onClose={handleClose}
            currency={effectiveCurrency}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly={true}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90dvh] max-h-[90dvh] h-[90dvh] rounded-t-3xl p-0 overflow-hidden flex flex-col border-t border-border bg-background">
        <DrawerTitle className="sr-only">Entry form</DrawerTitle>
        <EntryForm
          key={action}
          action={action}
          initialValues={initialValues}
          recurringRuleIdToAdvance={recurringRuleIdToAdvance}
          onClose={handleClose}
          currency={effectiveCurrency}
        />
      </DrawerContent>
    </Drawer>
  );
}
