"use client";

import type { ComponentProps } from "react";
import { PendingLink } from "@/components/ui/PendingLink";

// #271: 画面遷移リンクの統一スタイル（非青）。foreground ベースで両テーマ対応。
// 太字＋控えめな下線、ホバーで下線が濃くなる。外部アンカーや button にも
// className として流用できるよう文字列で公開する。
export const TEXT_LINK_CLASS =
  "font-medium text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground";

// フォーム内などの小さなテキストアクション（<button>）用。下線なし・ホバーで色が濃くなる。
export const TEXT_ACTION_CLASS =
  "font-medium text-foreground/70 transition-colors hover:text-foreground";

type TextLinkProps = ComponentProps<typeof PendingLink>;

// 内部遷移リンクの既定表現。PendingLink をラップし TEXT_LINK_CLASS を付与する
// （追加の className はマージ。text-xs 等のサイズ指定は呼び出し側から渡せる）。
export function TextLink({ className = "", ...props }: TextLinkProps) {
  return <PendingLink {...props} className={`${TEXT_LINK_CLASS} ${className}`} />;
}
