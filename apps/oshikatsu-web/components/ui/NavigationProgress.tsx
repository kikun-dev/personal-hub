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
type NavigationProgressContextValue = {
  isProgressActive: boolean;
  startProgress: (targetUrl: string) => void;
  stopProgress: () => void;
};

type ProgressState = {
  targetUrl: string;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [progressState, setProgressState] = useState<ProgressState | null>(
    null
  );
  const isProgressActive = progressState !== null;

  const startProgress = useCallback((targetUrl: string) => {
    setProgressState({
      targetUrl,
    });
  }, []);

  const stopProgress = useCallback(() => {
    setProgressState(null);
  }, []);

  useEffect(() => {
    if (!progressState) {
      return;
    }

    const stopIfReachedTarget = () => {
      if (window.location.href === progressState.targetUrl) {
        setProgressState(null);
      }
    };

    const timeoutId = window.setTimeout(() => {
      setProgressState(null);
    }, 10000);
    const intervalId = window.setInterval(stopIfReachedTarget, 100);

    stopIfReachedTarget();
    window.addEventListener("popstate", stopIfReachedTarget);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("popstate", stopIfReachedTarget);
    };
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
