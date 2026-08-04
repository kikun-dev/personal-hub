"use client";

import type { ComponentProps } from "react";
import { textLinkClass } from "@/components/ui/interactionStyles";
import { PendingLink } from "@/components/ui/PendingLink";

type TextLinkProps = ComponentProps<typeof PendingLink>;

// 内部遷移リンクの既定表現。PendingLink をラップし textLinkClass を付与する
// （追加の className はマージ。text-xs 等のサイズ指定は呼び出し側から渡せる）。
export function TextLink({ className = "", ...props }: TextLinkProps) {
  return <PendingLink {...props} className={`${textLinkClass} ${className}`} />;
}
