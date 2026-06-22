"use client";

import Link, { type LinkProps, useLinkStatus } from "next/link";
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useNavigationProgress } from "@/components/ui/NavigationProgress";
import { registerListBackNavigation } from "@/components/ui/listBackNavigation";

type PendingLinkFeedback = "inline" | "global" | "none";

type PendingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    feedback?: PendingLinkFeedback;
    listBackFallbackHref?: string;
    pendingLabel?: string;
  };

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getFeedbackTargetUrl(href: LinkProps["href"]): string | null {
  if (typeof href !== "string" || typeof window === "undefined") {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const targetUrl = new URL(href, window.location.href);

  if (targetUrl.origin !== currentUrl.origin) {
    return null;
  }

  if (targetUrl.href === currentUrl.href) {
    return null;
  }

  const isHashOnlyNavigation =
    targetUrl.pathname === currentUrl.pathname &&
    targetUrl.search === currentUrl.search &&
    targetUrl.hash.length > 0;

  if (isHashOnlyNavigation) {
    return null;
  }

  return targetUrl.href;
}

function PendingLinkContent({
  children,
  isNavigating,
  pendingLabel,
}: {
  children: ReactNode;
  isNavigating: boolean;
  pendingLabel: string;
}) {
  const { pending } = useLinkStatus();
  const isPending = pending || isNavigating;

  return (
    <>
      {children}
      {isPending && (
        <span
          aria-label={pendingLabel}
          className="absolute right-3 top-3 h-3 w-3 animate-spin rounded-full border border-foreground/20 border-t-foreground/70"
          role="status"
        />
      )}
    </>
  );
}

export function PendingLink({
  children,
  className = "",
  feedback = "inline",
  listBackFallbackHref,
  onClick,
  pendingLabel = "読み込み中",
  target,
  ...props
}: PendingLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const { startProgress } = useNavigationProgress();

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsNavigating(false);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [isNavigating]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      isModifiedClick(event) ||
      target === "_blank"
    ) {
      return;
    }

    const targetUrl = getFeedbackTargetUrl(props.href);

    if (!targetUrl) {
      return;
    }

    if (listBackFallbackHref) {
      registerListBackNavigation({
        fallbackHref: listBackFallbackHref,
        targetHref: targetUrl,
      });
    }

    if (feedback === "global") {
      startProgress(targetUrl);
      return;
    }

    if (feedback === "none") {
      return;
    }

    if (isNavigating) {
      event.preventDefault();
      return;
    }

    setIsNavigating(true);
  };

  const isInlineNavigating = feedback === "inline" && isNavigating;
  const navigatingClassName = isInlineNavigating
    ? "pointer-events-none opacity-70"
    : "";

  return (
    <Link
      {...props}
      aria-busy={isInlineNavigating}
      aria-disabled={isInlineNavigating}
      className={`${className} relative ${navigatingClassName}`.trim()}
      onClick={handleClick}
      target={target}
    >
      {feedback === "inline" ? (
        <PendingLinkContent
          isNavigating={isNavigating}
          pendingLabel={pendingLabel}
        >
          {children}
        </PendingLinkContent>
      ) : (
        children
      )}
    </Link>
  );
}
