"use client";

import { useParams } from "next/navigation";
import { PendingLink } from "@/components/ui/PendingLink";
import { standaloneTargetClass } from "@/components/ui/interactionStyles";
import { APP_ROUTES } from "@/lib/routes";
import { isValidUuid } from "@/lib/validation";

// セットリスト取得時にnotFound()が呼ばれた場合の表示（page.tsx:21 ライブ自体が無い /
// :26 対象公演がそのライブに属さない）。親ライブへの導線があった方が復帰が速いため、
// ライブ一覧に加えて親Liveへのリンクも出す（#486 Decision 6）。
//
// Next.jsの規約上not-found.tsxはparamsをpropsで受け取れないため、Client Componentに
// してuseParams()から親ライブのid（"id"セグメント）を読む。この値はURLセグメントの
// 生値そのもの（ここに到達する時点でライブ有無・公演一致は未検証）であり、そのまま
// href に埋め込むと不正な値（例: "../etc" のようなパストラバーサル的文字列）を
// リンク先へ流し込みかねない。isValidUuid（lib/validation.ts、performance_id等の
// DB PK/FK検証と同じ基準）でUUID形式であることを確認できた場合のみ親リンクを出し、
// 検証を通らない場合は親リンクを出さずライブ一覧のみへfallbackする。
export default function SetlistNotFound() {
  const params = useParams<{ id?: string | string[] }>();
  const rawLiveId = params?.id;
  const liveId =
    typeof rawLiveId === "string" && isValidUuid(rawLiveId) ? rawLiveId : null;

  return (
    <div className="rounded-lg border border-border-subtle p-6 text-center">
      <h1 className="text-base font-semibold text-foreground">
        セットリストが見つかりません
      </h1>
      <p className="mt-1 text-sm text-foreground-secondary">
        指定されたセットリストは存在しないか、削除された可能性があります。
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        {liveId && (
          <PendingLink
            href={`/lives/${liveId}`}
            feedback="global"
            className={`text-sm text-foreground-secondary hover:text-foreground ${standaloneTargetClass}`}
          >
            ← ライブ詳細へ戻る
          </PendingLink>
        )}
        <PendingLink
          href={APP_ROUTES.lives}
          feedback="global"
          className={`text-sm text-foreground-secondary hover:text-foreground ${standaloneTargetClass}`}
        >
          ← ライブ一覧
        </PendingLink>
      </div>
    </div>
  );
}
