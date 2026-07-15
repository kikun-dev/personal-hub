"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LiveAttendance, UpsertAttendanceInput } from "@/types/attendance";
import { ATTENDED_TYPE_LABELS, ATTENDED_TYPE_VALUES } from "@/types/attendance";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { useAdminForm } from "@/hooks/useAdminForm";
import {
  upsertAttendanceAction,
  deleteAttendanceAction,
} from "@/app/(authenticated)/lives/[id]/actions";

type AttendanceControlProps = {
  performanceId: string;
  // 未登録は null（RLSにより自分の行しか返らないため「無い」と「未取得」は区別不要）
  attendance: LiveAttendance | null;
};

const ATTENDED_TYPE_OPTIONS = ATTENDED_TYPE_VALUES.map((value) => ({
  value,
  label: ATTENDED_TYPE_LABELS[value],
}));

function toFormValues(
  performanceId: string,
  attendance: LiveAttendance | null
): UpsertAttendanceInput {
  return {
    performanceId,
    attendedType: attendance?.attendedType ?? "",
    seatNote: attendance?.seatNote ?? "",
    note: attendance?.note ?? "",
  };
}

export function AttendanceControl({
  performanceId,
  attendance,
}: AttendanceControlProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [pendingFocus, setPendingFocus] = useState<"edit" | "record" | null>(
    null
  );
  const [notice, setNotice] = useState("");
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const [isRefreshing, startRefresh] = useTransition();
  // refresh 中に読み上げ/表示する処理中文言を選ぶための原因。isRefreshing が true の間だけ参照する
  const refreshCauseRef = useRef<"save" | "delete" | null>(null);

  const { values, update, errors, setValues, setErrors, isSubmitting, handleSubmit } =
    useAdminForm<UpsertAttendanceInput>({
      initialValues: () => toFormValues(performanceId, attendance),
      onSubmit: async (input) => {
        const result = await upsertAttendanceAction(input);
        if (!result.errors) {
          setIsEditing(false);
          setNotice("参戦記録を保存しました");
          setPendingFocus("edit");
          refreshCauseRef.current = "save";
          startRefresh(() => {
            router.refresh();
          });
        }
        return result;
      },
    });

  const isPending = isSubmitting || isDeleting || isRefreshing;

  // 新規登録の保存直後は router.refresh() が完了するまで attendance prop が null のままで
  // 「編集」ボタンが存在しないため、対象ボタンが mount されるまで pendingFocus を保持し、
  // attendance の変化で effect を再評価して focus を当てる。
  // 解除成功→「参戦を記録」も同じ仕組みで refresh 後に focus される。
  useEffect(() => {
    if (pendingFocus === null) return;
    // disabled のボタンは focus を受けられないため、pending（refresh 反映含む）解消後に当てる
    if (isPending) return;
    const el =
      pendingFocus === "edit" ? editButtonRef.current : recordButtonRef.current;
    if (el !== null) {
      el.focus();
      setPendingFocus(null);
    }
  }, [pendingFocus, attendance, isEditing, isPending]);

  const openForm = () => {
    if (isPending) return;
    // 開くたびに現在の登録内容（未登録ならデフォルト値）へ揃え、前回の入力が残らないようにする
    setValues(toFormValues(performanceId, attendance));
    setErrors({});
    setDeleteError(undefined);
    setNotice("");
    setIsEditing(true);
  };

  const closeForm = () => {
    setErrors({});
    setIsEditing(false);
    setPendingFocus(attendance !== null ? "edit" : "record");
  };

  const handleDelete = async () => {
    if (!window.confirm("参戦記録を解除しますか？")) return;

    setIsDeleting(true);
    setDeleteError(undefined);
    setNotice("");

    try {
      const result = await deleteAttendanceAction(performanceId);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setPendingFocus("record");
      refreshCauseRef.current = "delete";
      startRefresh(() => {
        router.refresh();
      });
    } finally {
      setIsDeleting(false);
    }
  };

  let content: ReactNode;

  if (isEditing) {
    content = (
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormErrorBanner message={errors._form} />

        <Select
          id={`attendedType-${performanceId}`}
          label="参戦種別"
          placeholder="選択してください"
          options={ATTENDED_TYPE_OPTIONS}
          value={values.attendedType}
          onChange={(e) =>
            update(
              "attendedType",
              e.target.value as UpsertAttendanceInput["attendedType"]
            )
          }
          error={errors.attendedType}
          disabled={isSubmitting}
        />

        <Input
          id={`seatNote-${performanceId}`}
          label="座席メモ"
          value={values.seatNote}
          onChange={(e) => update("seatNote", e.target.value)}
          error={errors.seatNote}
          disabled={isSubmitting}
        />

        <Textarea
          id={`note-${performanceId}`}
          label="メモ"
          value={values.note}
          onChange={(e) => update("note", e.target.value)}
          error={errors.note}
          disabled={isSubmitting}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="text-xs">
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={closeForm}
            className="text-xs"
          >
            キャンセル
          </Button>
        </div>
      </form>
    );
  } else if (!attendance) {
    content = (
      <>
        <p className="text-sm text-foreground/70">参戦記録はまだありません</p>
        <Button
          ref={recordButtonRef}
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={openForm}
          className="text-xs"
        >
          参戦を記録
        </Button>
      </>
    );
  } else {
    content = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <AttendedTypeBadge attendedType={attendance.attendedType} />
          {attendance.seatNote && (
            <span className="text-xs text-foreground/70">
              座席: {attendance.seatNote}
            </span>
          )}
        </div>
        {attendance.note && (
          <p className="whitespace-pre-wrap text-xs text-foreground/70">
            {attendance.note}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            ref={editButtonRef}
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={openForm}
            className="text-xs"
          >
            編集
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isPending}
            onClick={handleDelete}
            className="text-xs"
          >
            {isDeleting || (isRefreshing && refreshCauseRef.current === "delete")
              ? "解除中..."
              : "解除"}
          </Button>
        </div>
        {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
      </>
    );
  }

  return (
    <div className="space-y-2 border-t border-foreground/10 pt-3">
      <p className="text-xs font-medium text-foreground/70">参戦記録</p>
      {/* aria-busy はコンテンツ側に限定する。aria-busy=true の subtree 内の live region は
          支援技術が busy 解除までアナウンスを保留し得るため、role=status は busy の外に置く */}
      <div className="space-y-2" aria-busy={isPending}>
        {content}
      </div>
      <p role="status" className="sr-only">
        {isSubmitting
          ? "参戦記録を保存しています"
          : isDeleting || (isRefreshing && refreshCauseRef.current === "delete")
            ? "参戦記録を解除しています"
            : notice}
      </p>
    </div>
  );
}
