"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type NavigationProgressContextValue = {
  isProgressActive: boolean;
  startProgress: () => void;
  stopProgress: () => void;
};

type ProgressState = {
  pathname: string;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [progressState, setProgressState] = useState<ProgressState | null>(
    null
  );
  const isProgressActive = progressState?.pathname === pathname;

  const startProgress = useCallback(() => {
    setProgressState({
      pathname,
    });
  }, [pathname]);

  const stopProgress = useCallback(() => {
    setProgressState(null);
  }, []);

  useEffect(() => {
    if (!progressState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgressState(null);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [progressState]);

  const value = useMemo(
    () => ({
      isProgressActive,
      startProgress,
      stopProgress,
    }),
    [isProgressActive, startProgress, stopProgress]
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress(): NavigationProgressContextValue {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    return {
      isProgressActive: false,
      startProgress: () => undefined,
      stopProgress: () => undefined,
    };
  }

  return context;
}

export function NavigationProgressBar() {
  const { isProgressActive } = useNavigationProgress();

  if (!isProgressActive) {
    return null;
  }

  return (
    <div
      aria-label="画面遷移中"
      className="fixed left-0 top-0 z-50 h-0.5 w-full overflow-hidden bg-foreground/10"
      role="status"
    >
      <div className="h-full w-1/3 animate-pulse bg-foreground/70" />
    </div>
  );
}
