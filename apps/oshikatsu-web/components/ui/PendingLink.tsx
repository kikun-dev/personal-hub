"use client";

import Link, { type LinkProps, useLinkStatus } from "next/link";
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useState,
} from "react";

type PendingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    pendingLabel?: string;
  };

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
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
  onClick,
  pendingLabel = "読み込み中",
  target,
  ...props
}: PendingLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      isModifiedClick(event) ||
      target === "_blank"
    ) {
      return;
    }

    if (isNavigating) {
      event.preventDefault();
      return;
    }

    setIsNavigating(true);
  };

  const navigatingClassName = isNavigating
    ? "pointer-events-none opacity-70"
    : "";

  return (
    <Link
      {...props}
      aria-busy={isNavigating}
      aria-disabled={isNavigating}
      className={`${className} relative ${navigatingClassName}`.trim()}
      onClick={handleClick}
      target={target}
    >
      <PendingLinkContent
        isNavigating={isNavigating}
        pendingLabel={pendingLabel}
      >
        {children}
      </PendingLinkContent>
    </Link>
  );
}
