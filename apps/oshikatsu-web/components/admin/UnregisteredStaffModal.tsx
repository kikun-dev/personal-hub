"use client";

import { PERSON_ROLE_LABELS } from "@/types/person";
import { Button } from "@/components/ui/Button";
import type { UnregisteredStaff } from "@/lib/staffRoles";

type UnregisteredStaffModalProps = {
  entries: UnregisteredStaff[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// 未登録の制作陣をまとめて確認するモーダル。
export function UnregisteredStaffModal({
  entries,
  isSubmitting,
  onConfirm,
  onCancel,
}: UnregisteredStaffModalProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">
          未登録の制作陣があります
        </h2>
        <p className="mt-1 text-sm text-foreground/70">
          以下の制作陣は未登録です。担当を登録して続行しますか？
        </p>

        <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={`${entry.displayName}-${entry.role}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm"
            >
              <span className="text-foreground">{entry.displayName}</span>
              <span className="text-xs text-foreground/60">
                {PERSON_ROLE_LABELS[entry.role]}
                {entry.isExisting ? "（担当を追加）" : "（新規登録）"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "処理中..." : "追加して保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
