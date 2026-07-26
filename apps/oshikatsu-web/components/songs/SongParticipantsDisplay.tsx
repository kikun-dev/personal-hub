import type { SongParticipant } from "@/types/song";
import { Card } from "@/components/ui/Card";
import { formatMemberCountSummary } from "@/lib/memberCountSummary";

type SongParticipantsDisplayProps = {
  participants: SongParticipant[];
};

/**
 * 楽曲の参加メンバーとセンターの公開表示（#427）。
 *
 * 参加メンバーの正典は orbit_track_members（ADR 0007 2026-07-24改訂）なので、
 * フォーメーションが未登録でもセンターまで表示できる。
 * 並びと人数内訳はリリース詳細の参加メンバーと同じ規則（期昇順→かな順、
 * 「N人（1期生X人、…）」）に揃える。
 */
export function SongParticipantsDisplay({ participants }: SongParticipantsDisplayProps) {
  if (participants.length === 0) {
    return null;
  }

  const centers = participants.filter((participant) => participant.isCenter);

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground-secondary">参加メンバー</h2>
        <span className="text-xs text-foreground-secondary">
          {formatMemberCountSummary(
            participants.map((participant) => participant.generation)
          )}
        </span>
      </div>

      {centers.length > 0 && (
        <p className="mb-2 text-sm text-foreground">
          <span className="text-foreground-secondary">センター</span>{" "}
          {/* 色に依存せず、記号と太さでセンターを示す */}
          <span className="font-bold">
            {centers.map((center) => `★${center.memberNameJa}`).join(" ・ ")}
          </span>
        </p>
      )}

      <p className="text-sm text-foreground">
        {participants.map((participant) => participant.memberNameJa).join(" / ")}
      </p>
    </Card>
  );
}
