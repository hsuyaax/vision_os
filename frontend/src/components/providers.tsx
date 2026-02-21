"use client";

import React, { createContext, useContext } from "react";
import { useVisionSync } from "@/hooks/use-vision-sync";

type VisionSyncContextType = ReturnType<typeof useVisionSync>;

const VisionSyncContext = createContext<VisionSyncContextType | null>(null);

export function VisionSyncProvider({ children }: { children: React.ReactNode }) {
  const vs = useVisionSync();
  return (
    <VisionSyncContext.Provider value={vs}>
      {children}
    </VisionSyncContext.Provider>
  );
}

export function useVS() {
  const ctx = useContext(VisionSyncContext);
  if (!ctx) throw new Error("useVS must be used within VisionSyncProvider");
  return ctx;
}
