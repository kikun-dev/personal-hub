"use client";

import { useRouter } from "next/navigation";
import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useNavigationProgress } from "@/components/ui/NavigationProgress";

type ListBackButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick" | "type"
> & {
  children: ReactNode;
  fallbackHref: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

type NextHistoryState = {
  idx?: unknown;
};

function hasBackHistory(): boolean {
  const state = window.history.state as NextHistoryState | null;

  if (typeof state?.idx === "number") {
    return state.idx > 0;
  }

  return window.history.length > 1;
}

export function ListBackButton({
  children,
  className = "",
  fallbackHref,
  onClick,
  ...props
}: ListBackButtonProps) {
  const router = useRouter();
  const { startProgress } = useNavigationProgress();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (hasBackHistory()) {
      router.back();
      return;
    }

    const targetUrl = new URL(fallbackHref, window.location.href).href;
    startProgress(targetUrl);
    router.push(fallbackHref);
  };

  return (
    <button
      {...props}
      className={`${className} cursor-pointer bg-transparent p-0`.trim()}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
}
