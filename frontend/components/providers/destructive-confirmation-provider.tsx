"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DestructiveConfirmationDialog } from "@/components/ui/destructive-confirmation-dialog";

type ConfirmationOptions = {
  title: string;
  targetName: string;
  description: string;
  confirmLabel: string;
  errorMessage?: string;
  destructive?: boolean;
};

type ConfirmationRequest = ConfirmationOptions & {
  onConfirm: () => Promise<unknown>;
  returnFocusElement: HTMLElement | null;
};

const DestructiveConfirmationContext = createContext<
  ((options: ConfirmationOptions, onConfirm: () => Promise<unknown>) => void) | undefined
>(undefined);

export function DestructiveConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
  }, []);

  const confirmDestructive = useCallback((options: ConfirmationOptions, onConfirm: () => Promise<unknown>) => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menuTrigger = document.querySelector<HTMLElement>(
      '[aria-haspopup="menu"][aria-expanded="true"]',
    );
    const returnFocusElement = menuTrigger ?? activeElement;

    // Actions commonly originate inside a Radix DropdownMenu. Let that modal
    // layer finish closing before mounting the confirmation Dialog, otherwise
    // the two pointer/focus locks can overlap and leave the page non-interactive.
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setRequest({ ...options, onConfirm, returnFocusElement });
    }, 0);
  }, []);

  return (
    <DestructiveConfirmationContext.Provider value={confirmDestructive}>
      {children}
      {request && (
        <DestructiveConfirmationDialog
          {...request}
          open
          onOpenChange={(open) => {
            if (!open) setRequest(null);
          }}
        />
      )}
    </DestructiveConfirmationContext.Provider>
  );
}

export function useDestructiveConfirmation() {
  const confirmDestructive = useContext(DestructiveConfirmationContext);
  if (!confirmDestructive) {
    throw new Error("useDestructiveConfirmation must be used within DestructiveConfirmationProvider");
  }
  return confirmDestructive;
}
