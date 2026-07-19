"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

// #377: fallback carousel（最大18枚）のkeyboard focus densityを再設計する。
// 各cardのvenue/setlist/attendanceを全枚数分Tab順に並べると 54 の linear target になり、
// keyboard/screen reader userの探索負荷が高い。scroll位置のrectからviewport内の可視card
// だけをTab順に残し（offscreen cardの操作は tabindex=-1 で外すが a11y tree には残す）、
// 可視外の公演へは可視prev/next controlとArrowLeft/Rightの±1移動で到達する。位置contextは
// role=status が通知する。native touch/trackpad scroll と CSS snap（#357 containment）、
// #363の最大1 full controlは維持する（実際の可視性に従うだけなので snap-mandatory と競合しない）。
// ±1移動に限定し Home/End の一括ジャンプを提供しないのは、大きな programmatic scroll が
// snap-mandatory の再スナップ（別 snap 点への smooth 移動）を誘発して着地が不定になるため。

type PerformanceCarouselProps = {
  // region の accessible name を担う見出し（LiveDetail側の h2）の id
  headingId: string;
  // 位置通知（n / total ・ 公演名）用。順序は children の card 順と一致させる
  items: { id: string; label: string }[];
  children: ReactNode;
};

// card内のTab対象になりうる操作要素。offscreen cardではこれらを tabindex=-1 にする
const FOCUSABLE_SELECTOR = "a[href], button, select, input, textarea";
// 先頭（左端）がviewport内で、かつ先頭からこの割合以上表示されているcardを「可視 = Tab対象」
// とみなす。左端が切れたcard（操作が見切れる）や peek幅だけのcardをTab対象から除外する。
const VISIBLE_MIN_FRACTION = 0.6;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function PerformanceCarousel({
  headingId,
  items,
  children,
}: PerformanceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = items.length;
  // 可視レンジ。announcement は先頭可視card、境界（prev/next無効）は先頭/末尾可視で判定する。
  const [firstVisible, setFirstVisible] = useState(0);
  const [lastVisible, setLastVisible] = useState(0);
  // ナビ（Arrow/prev/next）は React state のlagを避けるため、同期更新される ref を基準にする。
  const firstVisibleRef = useRef(0);
  const lastVisibleRef = useRef(0);
  // 現在Tab対象（可視）のindex集合。MutationObserverからの再適用でも参照する。
  const visibleRef = useRef<Set<number>>(new Set([0]));

  const getCards = useCallback((): HTMLElement[] => {
    const container = scrollRef.current;
    if (container === null) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(':scope > [role="group"]')
    );
  }, []);

  // 可視card だけをTab順に残す（offscreen cardの操作は tabindex=-1）。a11y tree には残すため
  // inert は使わない。自分が付けた tabindex=-1 のみ data-roving-off で識別して復元する。
  const applyRoving = useCallback(() => {
    getCards().forEach((card, index) => {
      const tabbable = visibleRef.current.has(index);
      card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach((el) => {
        if (tabbable) {
          if (el.dataset.rovingOff === "true") {
            el.removeAttribute("tabindex");
            delete el.dataset.rovingOff;
          }
        } else if (el.getAttribute("tabindex") !== "-1") {
          el.setAttribute("tabindex", "-1");
          el.dataset.rovingOff = "true";
        }
      });
    });
  }, [getCards]);

  // bounding rect から現在の可視レンジを算出し、roving と announcement基準を更新する。
  // 「可視」= card の先頭（左端）がviewport内 かつ 先頭から VISIBLE_MIN_FRACTION 以上表示、
  // と定義する。これにより Tab は必ず「操作（先頭側にあるvenue/setlist/disclosure）まで
  // viewport内に見えているcard」へ入り、左端が切れたcardへfocusが飛ばない。snap-mandatoryや
  // wide viewportの複数可視、peek幅とも競合しない（実際のrectに従うだけ）。
  const computeVisible = useCallback(() => {
    const container = scrollRef.current;
    const cards = getCards();
    if (container === null || cards.length === 0) return;
    const cRect = container.getBoundingClientRect();
    const visible = new Set<number>();
    let first = -1;
    let last = -1;
    cards.forEach((card, index) => {
      const r = card.getBoundingClientRect();
      const startVisible = r.left >= cRect.left - 1;
      const shownFromStart = Math.min(r.right, cRect.right) - r.left;
      if (
        r.width > 0 &&
        startVisible &&
        shownFromStart >= r.width * VISIBLE_MIN_FRACTION
      ) {
        visible.add(index);
        if (first === -1) first = index;
        last = index;
      }
    });
    // scroll端数で一時的に可視0になっても直近の可視レンジを保持する（巻き戻さない）
    if (visible.size === 0) return;
    visibleRef.current = visible;
    firstVisibleRef.current = first;
    lastVisibleRef.current = last;
    setFirstVisible(first);
    setLastVisible(last);
    applyRoving();

    // #377 P1: tabindex=-1 では focus 済み要素は blur されないため、card内の操作へ focus した
    // まま Arrow/native scroll で可視範囲が変わると、focus が offscreen card に残り画面外へ出る。
    // focus 中 card が非可視になったら、先頭可視 card の対応操作へ focus を移し viewport 内に保つ。
    // preventScroll で focus 起点の再 scroll（snap 競合）を避ける。
    const active = document.activeElement;
    if (active instanceof HTMLElement && container.contains(active)) {
      const activeCard = active.closest<HTMLElement>('[role="group"]');
      const activeIndex = activeCard === null ? -1 : cards.indexOf(activeCard);
      if (activeIndex >= 0 && !visible.has(activeIndex)) {
        const focusTarget =
          cards[first]?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? null;
        focusTarget?.focus({ preventScroll: true });
      }
    }
  }, [getCards, applyRoving]);

  // native touch/trackpad/snap の scroll と viewportサイズ変化から可視レンジを更新する。
  useEffect(() => {
    const container = scrollRef.current;
    if (container === null) return;
    let frame = 0;
    const schedule = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        computeVisible();
      });
    };
    schedule(); // 初期反映（rAFで遅延し、effect body内の同期setStateを避ける）
    container.addEventListener("scroll", schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    return () => {
      container.removeEventListener("scroll", schedule);
      resizeObserver.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [computeVisible, total]);

  // #363 の展開で form field が動的に増減してもroving状態を保つ
  useEffect(() => {
    const container = scrollRef.current;
    if (container === null) return;
    const observer = new MutationObserver(() => applyRoving());
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [applyRoving]);

  const scrollToCard = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      const cards = getCards();
      if (container === null || cards.length === 0) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      const containerLeft = container.getBoundingClientRect().left;
      const scrollLeftFor = (i: number): number =>
        container.scrollLeft +
        (cards[i].getBoundingClientRect().left - containerLeft);

      // 目標cardの着地 scrollLeft を求める。最終card（snap-end）や start-align できない
      // 末尾寄りcard（scrollLeft が maxScroll 超）は maxScroll へ寄せる。maxScroll は
      // 最終card が右端整列で全表示される snap 点であり、±1 移動なので着地も小さなjumpで安定する
      // （0→max の大きな instant ジャンプだけが snap の再スナップを誘発する）。
      const target = Math.max(0, Math.min(total - 1, index));
      let desired =
        target === total - 1 ? maxScroll : scrollLeftFor(target);
      if (desired > maxScroll) desired = maxScroll;
      const left = Math.max(0, desired);

      if (prefersReducedMotion()) {
        // 大きな instant ジャンプを scrollTo({behavior:"instant"}) で行うと snap-mandatory が
        // 別 snap 点へ smooth な再スナップを始めて着地が飛ぶ。scrollLeft への直接代入なら
        // 同期確定し、その位置が snap 点（各cardの整列位置）なら再スナップが起きない。
        container.scrollLeft = left;
        // 位置が同期的に確定するので、その場で可視レンジ/roving を反映する（Tab より先に確定）。
        computeVisible();
      } else {
        container.scrollTo({ left, behavior: "smooth" });
      }
    },
    [getCards, total, computeVisible]
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // text入力中のArrowはcaret移動として尊重し、carousel移動へ横取りしない
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    // Arrowによる±1移動のみ扱う。Home/Endの一括ジャンプは snap-mandatory が大きな
    // programmatic scroll を別 snap 点へ再スナップさせ着地が不定になるため提供しない
    // （任意公演へは prev/next / Arrow の反復で確実に到達できる）。
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        scrollToCard(firstVisibleRef.current + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        scrollToCard(firstVisibleRef.current - 1);
        break;
      default:
        break;
    }
  };

  const positionLabel =
    total === 0 ? "0 / 0" : `${firstVisible + 1} / ${total}`;
  const activeLabel = items[firstVisible]?.label ?? "";
  const atStart = firstVisible <= 0;
  const atEnd = lastVisible >= total - 1;

  // 境界のprev/nextは native disabled にしない。操作中のcontrolをdisabledにすると
  // End/ArrowRightで末尾へ到達した瞬間にfocusを失う（focusがbodyへ落ちる）ため、
  // aria-disabled + no-op で「境界だが focus と Tab順は保持する」表現にする。
  const controlClass =
    "min-h-11 min-w-11 px-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

  return (
    <div onKeyDown={handleKeyDown} className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <span
          aria-hidden="true"
          className="text-xs tabular-nums text-foreground-secondary"
        >
          {positionLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          aria-label="前の公演"
          aria-disabled={atStart}
          onClick={() => {
            if (!atStart) scrollToCard(firstVisibleRef.current - 1);
          }}
          className={controlClass}
        >
          <span aria-hidden="true">◀</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="次の公演"
          aria-disabled={atEnd}
          onClick={() => {
            if (!atEnd) scrollToCard(firstVisibleRef.current + 1);
          }}
          className={controlClass}
        >
          <span aria-hidden="true">▶</span>
        </Button>
      </div>

      {/* #357: root overflow を発生させず inner だけが scroll する containment を維持する。
          data-testid / role=region / aria-labelledby / snap / contain は従来の carousel div と同一。 */}
      <div
        ref={scrollRef}
        data-testid="live-performance-carousel"
        role="region"
        aria-labelledby={headingId}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [contain:paint]"
      >
        {children}
      </div>

      {/* 位置context（n / total ・ 公演名/日付）を支援技術へ通知する。
          可視の位置表示は aria-hidden にし、読み上げはこの polite live region が担う。 */}
      <p role="status" aria-live="polite" className="sr-only">
        {total === 0 ? "" : `${positionLabel}・${activeLabel}`}
      </p>
    </div>
  );
}
