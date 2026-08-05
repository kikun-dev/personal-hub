// filterで一覧の件数が変わっても、通常のspan/divでは支援技術に変化が通知されない
// （GF-SAKA-004 / CF-MEMBER-006）。<output>要素は暗黙でrole="status"
// （= aria-live="polite"）を持つため、role/aria-liveを明示的に重ねずに済む。
// aria-atomic="true"だけを加え、件数を1つのまとまりとして読み上げさせる。
//
// このcomponentは1つのlive region nodeの内容が更新されるだけの単純な構造に留める。
// debounceやannounce制御用のuseState/useEffectは持たない（過剰な実装を避け、
// filter判定・Empty文言・resetなど呼び出し側の責務を混ぜ込まないため）。
// Server Componentからでも使えるよう"use client"は付けない（#482）。

import type { HTMLAttributes } from "react";

type CollectionResultStatusProps = Omit<
  HTMLAttributes<HTMLOutputElement>,
  "role" | "aria-live" | "aria-atomic" | "children"
> & {
  count: number;
  unit: string;
};

export function CollectionResultStatus({
  count,
  unit,
  ...props
}: CollectionResultStatusProps) {
  return (
    <output aria-atomic="true" {...props}>
      {count}
      {unit}
    </output>
  );
}
