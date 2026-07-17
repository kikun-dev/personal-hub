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
  const { isActive, toggle, notifyEditing } =
    useAttendanceExpansion(performanceId);
  const panelId = `attendance-panel-${performanceId}`;

  return (
    <div className="space-y-2 border-t border-border-subtle pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground-secondary">参戦記録</p>
        {/* disclosureのfocusはtoggle button自身に残す（プログラムでfocusを移動しない）。
            展開/collapseはclick時のnative focusのみに委ねる */}
        <Button
          type="button"
          variant="ghost"
          aria-expanded={isActive}
          aria-controls={panelId}
          onClick={toggle}
          className="text-xs"
        >
          {isActive ? "閉じる" : attendance ? "記録を開く" : "参戦を記録"}
        </Button>
      </div>

      {isActive ? (
        <div id={panelId}>
          {/* showHeading=false: このコンポーネント側で既に「参戦記録」ラベルと
              区切り線を描画しているため、AttendanceControl自身の見出しは出さない */}
          <AttendanceControl
            performanceId={performanceId}
            attendance={attendance}
            showHeading={false}
            onEditingChange={notifyEditing}
          />
        </div>
      ) : (
        <div id={panelId} className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
