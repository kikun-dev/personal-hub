import Link from "next/link";
import { textLinkClass } from "@/components/ui/interactionStyles";
import { APP_ROUTES } from "@/lib/routes";
import type {
  ExclusionReason,
  ResolveOriginalMembersResult,
} from "@/usecases/resolveOriginalMembers";

const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  "not-yet-joined": "未加入",
  graduated: "卒業",
  absent: "休演",
  "not-in-roster": "出演メンバー未登録",
};

type OriginalMembersNoticeProps = {
  result: ResolveOriginalMembersResult;
  liveId: string;
  trackId: string;
};

/**
 * オリメン反映の結果通知（#424）。
 *
 * 除外は想定内の情報表示、登録漏れは行動可能な導線として出し分ける。
 * 反映直後だけでなく保存まで残し、除外された事実を見返せるようにする。
 * 件数と理由をテキストで示し、色だけに依存させない。
 */
export function OriginalMembersNotice({
  result,
  liveId,
  trackId,
}: OriginalMembersNoticeProps) {
  const noticeClass =
    "mt-1 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-foreground";

  if (result.status === "blocked") {
    return (
      <p className={noticeClass}>
        {result.reason === "no-track-participants" && (
          <>
            この楽曲に参加メンバーが登録されていないため反映できません。
            <Link
              href={`${APP_ROUTES.admin}/songs/${trackId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-1 ${textLinkClass}`}
            >
              楽曲を編集（新しいタブ）
            </Link>
          </>
        )}
        {result.reason === "no-roster" && (
          <>
            このライブの出演メンバーが登録されていないため反映できません。
            <Link
              href={`${APP_ROUTES.admin}/lives/${liveId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-1 ${textLinkClass}`}
            >
              ライブを編集（新しいタブ）
            </Link>
          </>
        )}
        {result.reason === "inconsistent-track-data" && (
          <>
            楽曲マスタの参加メンバーとフォーメーションが一致していないため反映できません。
            <Link
              href={`${APP_ROUTES.admin}/songs/${trackId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-1 ${textLinkClass}`}
            >
              楽曲を編集（新しいタブ）
            </Link>
          </>
        )}
      </p>
    );
  }

  // 想定内の除外（未加入・卒業・休演）と、登録漏れ（出演メンバー未登録）を分ける
  const expectedExclusions = result.exclusions.filter(
    (exclusion) => exclusion.reason !== "not-in-roster"
  );
  const notInRoster = result.exclusions.find(
    (exclusion) => exclusion.reason === "not-in-roster"
  );

  const hasNotice =
    expectedExclusions.length > 0 || notInRoster || result.isMembershipCheckSkipped;
  if (!hasNotice) {
    return (
      <p className={noticeClass}>{result.members.length}人を反映しました。</p>
    );
  }

  return (
    <div className={noticeClass}>
      <p>
        {result.members.length}人を反映しました。
        {expectedExclusions.length > 0 && (
          <>
            {" "}
            {expectedExclusions
              .map(
                (exclusion) =>
                  `${EXCLUSION_LABELS[exclusion.reason]}${exclusion.memberIds.length}人`
              )
              .join("、")}
            を除外しています。
          </>
        )}
      </p>

      {result.isMembershipCheckSkipped && (
        <p className="mt-1">
          公演日が未登録のため、卒業・未加入の判定を行っていません。
        </p>
      )}

      {/* 「現役」は在籍判定が行われた場合しか確定しない（公演日未登録や在籍履歴なしでも
          ここへ来る）。UseCase が確定していない分類をUIで断定せず、
          出演メンバー未登録という確認済みの事実だけを述べる。 */}
      {notInRoster && (
        <p className="mt-1">
          {notInRoster.memberIds.length}人はこのライブの出演メンバーに未登録のため反映していません。
          <Link
            href={`${APP_ROUTES.admin}/lives/${liveId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className={`ml-1 ${textLinkClass}`}
          >
            ライブを編集（新しいタブ）
          </Link>
        </p>
      )}
    </div>
  );
}
