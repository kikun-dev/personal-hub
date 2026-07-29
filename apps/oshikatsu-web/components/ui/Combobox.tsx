"use client";

import { useEffect, useId, useRef, useState } from "react";
import { focusRingClass } from "@/components/ui/focusRing";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** 未設定（クリア）の選択肢ラベル。指定時は先頭に表示する */
  emptyLabel?: string;
  className?: string;
};

/**
 * 候補（option）は意図的にフォーカス不可にしている（#458）。
 * フォーカスは常に入力欄に留め、キーボード操作は矢印キー + `aria-activedescendant` で行う。
 * 候補を button 等のタブストップに戻すと、Tab が候補数だけ空打ちされて
 * フォーム内の次の項目へ進めなくなるため、フォーカス可能な要素を再導入しないこと。
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "入力して検索",
  ariaLabel,
  emptyLabel,
  className = "",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered =
    normalizedQuery === ""
      ? options
      : options.filter((opt) =>
          opt.label.toLowerCase().includes(normalizedQuery)
        );

  type Row = { value: string; label: string; isEmpty?: boolean };
  // 検索中（入力あり）は「未設定」行を出さず、最初の候補を選べるようにする
  const rows: Row[] = [
    ...(emptyLabel && normalizedQuery === ""
      ? [{ value: "", label: emptyLabel, isEmpty: true }]
      : []),
    ...filtered,
  ];

  const safeHighlight =
    rows.length === 0 ? -1 : Math.min(Math.max(highlight, 0), rows.length - 1);

  // 候補をタブストップから外した結果、Tab でのフォーカス移動に伴うブラウザ既定の
  // スクロールが働かなくなった（従来はそれで選択中候補が見えていた）。
  // フォーカスは入力欄に留まるためリストは自力でスクロールしない。ここで明示的に寄せる。
  useEffect(() => {
    if (!open || safeHighlight < 0) return;
    optionRefs.current[safeHighlight]?.scrollIntoView({ block: "nearest" });
  }, [open, safeHighlight]);

  const commit = (rowValue: string) => {
    onChange(rowValue);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      if (open && safeHighlight >= 0) {
        event.preventDefault();
        commit(rows[safeHighlight].value);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (event.key === "Tab") {
      // Tab は既定どおりフォーカスを次へ移す（preventDefault しない）。
      // 外側クリック検知は mousedown だけなので、閉じる処理をここでも行う。
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-activedescendant={
          open && safeHighlight >= 0 ? optionId(safeHighlight) : undefined
        }
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary ${focusRingClass}`}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-subtle bg-background py-1 shadow-lg"
        >
          {rows.length === 0 ? (
            // listbox の子は option だけにするため、この行は option 扱いにしない
            <li
              role="presentation"
              className="px-3 py-2 text-sm text-foreground-secondary"
            >
              候補がありません
            </li>
          ) : (
            rows.map((row, index) => (
              <li
                key={row.isEmpty ? "__empty__" : row.value}
                id={optionId(index)}
                role="option"
                aria-selected={index === safeHighlight}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                // mousedown では確定せず、入力欄からDOM focusが外れるのを防ぐだけにする。
                // 確定は click に結び付ける（#458）。支援技術や音声操作は mousedown を
                // 伴わない click を合成するため、mousedown だけに commit を置くと
                // それらの経路から候補を選べなくなる。
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => commit(row.value)}
                onMouseEnter={() => setHighlight(index)}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm ${
                  index === safeHighlight ? "bg-surface-subtle" : ""
                } ${row.isEmpty ? "text-foreground-secondary" : "text-foreground"} ${
                  row.value === value ? "font-medium" : ""
                }`}
              >
                {row.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
