import type { SongParticipant } from "@/types/song";
import { Card } from "@/components/ui/Card";

type SongParticipantsDisplayProps = {
  participants: SongParticipant[];
};

/**
 * 楽曲の参加メンバーとセンターの公開表示（#427）。
 *
 * 参加メンバーの正典は orbit_track_members（ADR 0007 2026-07-24改訂）なので、
 * フォーメーションが未登録でもセンターまで表示できる。
 * フォーメーション未登録は欠損ではなく「未解禁」という正常な状態のため、
 * ここでは注意を引く表現を使わない。
 */
export function SongParticipantsDisplay({ participants }: SongParticipantsDisplayProps) {
  if (participants.length === 0) {
    return null;
  }

  const centers = participants.filter((participant) => participant.isCenter);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-medium text-foreground-secondary">
        参加メンバー
      </h2>

      {centers.length > 0 && (
        <p className="mb-2 text-sm text-foreground">
          <span className="text-foreground-secondary">センター</span>{" "}
          {/* 色に依存せず、記号と太さでセンターを示す */}
          <span className="font-bold">
            ★{centers.map((center) => center.memberNameJa).join(" ・ ★")}
          </span>
        </p>
      )}

      <p className="text-sm text-foreground">
        {participants.map((participant) => participant.memberNameJa).join(" ・ ")}
      </p>
      <p className="mt-2 text-xs text-foreground-secondary">{participants.length}人</p>
    </Card>
  );
}
