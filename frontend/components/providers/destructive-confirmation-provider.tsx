"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { DestructiveConfirmationDialog } from "@/components/ui/destructive-confirmation-dialog";

type ConfirmationOptions = {
  title: string;
  targetName: string;
  description: string;
  confirmLabel: string;
  errorMessage?: string;
  destructive?: boolean;
};

type ConfirmationRequest = ConfirmationOptions & { onConfirm: () => Promise<unknown> };

const DestructiveConfirmationContext = createContext<
  ((options: ConfirmationOptions, onConfirm: () => Promise<unknown>) => void) | undefined
>(undefined);

export function DestructiveConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  const confirmDestructive = useCallback((options: ConfirmationOptions, onConfirm: () => Promise<unknown>) => {
    setRequest({ ...options, onConfirm });
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
