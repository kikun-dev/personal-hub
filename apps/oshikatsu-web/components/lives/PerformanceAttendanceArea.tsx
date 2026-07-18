"use client";

import type { LiveAttendance } from "@/types/attendance";
import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { AttendanceControl } from "@/components/lives/AttendanceControl";
import { Button } from "@/components/ui/Button";
import { useAttendanceExpansion } from "@/components/lives/AttendanceExpansion";

type PerformanceAttendanceAreaProps = {
  performanceId: string;
  attendance: LiveAttendance | null;
};

// #363: fallback carouselの各card用。未展開時はform/state/effectを持つAttendanceControlを
// mountせず、static compactな状態表示のみを出す。展開中の最大1公演だけAttendanceControlを
// conditional mountする（AttendanceExpansionProviderが同時展開数を1件に保つ）。
export function PerformanceAttendanceArea({
  performanceId,
  attendance,
}: PerformanceAttendanceAreaProps) {
  const { isActive, isLocked, toggle, notifyEditing, notifyPending } =
    useAttendanceExpansion(performanceId);
  // #375レビュー指摘: detail regionは常にmountしてidを安定させ、collapsed時はhiddenにする。
  // aria-expandedとdetail regionの可視性を常に一致させるための構造（AttendanceControl自体の
  // conditional mountは維持する）
  const detailId = `attendance-panel-${performanceId}`;

  return (
    <div className="space-y-2 border-t border-border-subtle pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground-secondary">参戦記録</p>
        {/* disclosureのfocusはtoggle button自身に残す（プログラムでfocusを移動しない）。
            展開/collapseはclick時のnative focusのみに委ねる。
            #375レビュー指摘: 保存/削除処理中（isLocked）は同時編集による迂回を防ぐため無効化する */}
        <Button
          type="button"
          variant="ghost"
          aria-expanded={isActive}
          aria-controls={detailId}
          disabled={isLocked}
          onClick={toggle}
          className="min-h-11 text-xs"
        >
          {isActive ? "閉じる" : attendance ? "記録を開く" : "参戦を記録"}
        </Button>
      </div>

      {/* #375レビュー指摘: compact summaryはcontrolled region（detail div）の外に置く。
          展開中はAttendanceControlが同じ情報を表示するため、二重表示を避けてここでは出さない */}
      {!isActive && (
        <div className="flex flex-wrap items-center gap-2">
          {attendance ? (
            <>
              <AttendedTypeBadge attendedType={attendance.attendedType} />
              {attendance.seatNote && (
                <span className="text-xs text-foreground-secondary">
                  座席: {attendance.seatNote}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-foreground-secondary">未記録</span>
          )}
        </div>
      )}

      <div id={detailId} hidden={!isActive}>
        {isActive && (
          // showHeading=false: このコンポーネント側で既に「参戦記録」ラベルと
          // 区切り線を描画しているため、AttendanceControl自身の見出しは出さない
          <AttendanceControl
            performanceId={performanceId}
            attendance={attendance}
            showHeading={false}
            // #375レビュー指摘: 未登録の公演は展開直後にformを直接開く
            // （「参戦を記録」→「参戦を記録」の二段階CTAを解消）
            defaultEditing={attendance === null}
            onEditingChange={notifyEditing}
            onPendingChange={notifyPending}
          />
        )}
      </div>
    </div>
  );
}
