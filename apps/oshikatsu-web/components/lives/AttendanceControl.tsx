"use client";

import { useState } from "react";
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

  const { values, update, errors, setValues, setErrors, isSubmitting, handleSubmit } =
    useAdminForm<UpsertAttendanceInput>({
      initialValues: () => toFormValues(performanceId, attendance),
      onSubmit: async (input) => {
        const result = await upsertAttendanceAction(input);
        if (!result.errors) {
          setIsEditing(false);
          router.refresh();
        }
        return result;
      },
    });

  const openForm = () => {
    // 開くたびに現在の登録内容（未登録ならデフォルト値）へ揃え、前回の入力が残らないようにする
    setValues(toFormValues(performanceId, attendance));
    setErrors({});
    setDeleteError(undefined);
    setIsEditing(true);
  };

  const closeForm = () => {
    setErrors({});
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("参戦記録を解除しますか？")) return;

    setIsDeleting(true);
    setDeleteError(undefined);

    try {
      const result = await deleteAttendanceAction(performanceId);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-foreground/10 p-3"
      >
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
        />

        <Input
          id={`seatNote-${performanceId}`}
          label="座席メモ"
          value={values.seatNote}
          onChange={(e) => update("seatNote", e.target.value)}
          error={errors.seatNote}
        />

        <Textarea
          id={`note-${performanceId}`}
          label="メモ"
          value={values.note}
          onChange={(e) => update("note", e.target.value)}
          error={errors.note}
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
  }

  if (!attendance) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={openForm}
        className="text-xs"
      >
        参戦を記録
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-foreground/10 p-3">
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
          type="button"
          variant="secondary"
          onClick={openForm}
          className="text-xs"
        >
          編集
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={isDeleting}
          onClick={handleDelete}
          className="text-xs"
        >
          {isDeleting ? "解除中..." : "解除"}
        </Button>
      </div>
      {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
    </div>
  );
}
