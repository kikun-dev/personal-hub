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
import { consumeListBackNavigation } from "@/components/ui/listBackNavigation";

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
  const { startProgress } = useNavigationProgress();

  useEffect(() => {
    canReturnToListRef.current = consumeListBackNavigation({
      currentHref: window.location.href,
      fallbackHref,
    });
  }, [fallbackHref]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (canReturnToListRef.current) {
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
