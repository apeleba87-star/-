"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadPublicJobPayMode,
  PUBLIC_JOB_PAY_MODE_STORAGE_KEY,
  type PublicJobPayDisplayMode,
} from "@/lib/jobs-public/pay-display-mode";

type PayModeContextValue = {
  payMode: PublicJobPayDisplayMode;
  setPayMode: (mode: PublicJobPayDisplayMode) => void;
};

const PayModeContext = createContext<PayModeContextValue | null>(null);

export function PublicJobPayModeProvider({ children }: { children: ReactNode }) {
  const [payMode, setPayModeState] = useState<PublicJobPayDisplayMode>("monthly");

  useEffect(() => {
    setPayModeState(loadPublicJobPayMode());
  }, []);

  const setPayMode = useCallback((mode: PublicJobPayDisplayMode) => {
    setPayModeState(mode);
    try {
      localStorage.setItem(PUBLIC_JOB_PAY_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ payMode, setPayMode }), [payMode, setPayMode]);

  return <PayModeContext.Provider value={value}>{children}</PayModeContext.Provider>;
}

export function usePublicJobPayMode(): PayModeContextValue {
  const ctx = useContext(PayModeContext);
  if (!ctx) {
    throw new Error("usePublicJobPayMode must be used within PublicJobPayModeProvider");
  }
  return ctx;
}
