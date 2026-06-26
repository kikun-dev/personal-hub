"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const listId = useId();

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
  const rows: Row[] = [
    ...(emptyLabel ? [{ value: "", label: emptyLabel, isEmpty: true }] : []),
    ...filtered,
  ];

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
      if (open && rows[highlight]) {
        event.preventDefault();
        commit(rows[highlight].value);
      }
    } else if (event.key === "Escape") {
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
        className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-foreground/10 bg-background py-1 shadow-lg"
        >
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-sm text-foreground/40">
              候補がありません
            </li>
          ) : (
            rows.map((row, index) => (
              <li key={row.isEmpty ? "__empty__" : row.value}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(row.value);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-sm ${
                    index === highlight ? "bg-foreground/10" : ""
                  } ${row.isEmpty ? "text-foreground/50" : "text-foreground"} ${
                    row.value === value ? "font-medium" : ""
                  }`}
                >
                  {row.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
