"use client";

import { useRouter } from "next/navigation";
import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { useNavigationProgress } from "@/components/ui/NavigationProgress";
import {
  consumeListBackNavigation,
  hasListBackNavigation,
} from "@/components/ui/listBackNavigation";
import {
  focusRingClass,
  standaloneTargetClass,
} from "@/components/ui/interactionStyles";

type ListBackButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick" | "type"
> & {
  children: ReactNode;
  fallbackHref: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

export function ListBackButton({
  children,
  className = "",
  fallbackHref,
  onClick,
  ...props
}: ListBackButtonProps) {
  const router = useRouter();
  const canReturnToListRef = useRef(false);
  const hasCheckedRef = useRef(false);
  const { startProgress } = useNavigationProgress();

  useEffect(() => {
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;
    canReturnToListRef.current = hasListBackNavigation({
      currentHref: window.location.href,
      fallbackHref,
    });
  }, [fallbackHref]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const hadListNavigation = canReturnToListRef.current;
    canReturnToListRef.current = false;
    const hasValidListNavigation = consumeListBackNavigation({
      currentHref: window.location.href,
      fallbackHref,
    });

    if (hadListNavigation && hasValidListNavigation) {
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
      className={`${className} ${standaloneTargetClass} ${focusRingClass} cursor-pointer bg-transparent p-0`.trim()}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
}
