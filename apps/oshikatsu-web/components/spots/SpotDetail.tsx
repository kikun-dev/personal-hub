import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TEXT_LINK_CLASS, TextLink } from "@/components/ui/TextLink";
import { SpotLocationMap } from "@/components/spots/SpotLocationMap";
import { formatDate } from "@/lib/formatters";
import { getSongVideoTypeLabel } from "@/types/song";
import { SPOT_SOURCE_TYPE_LABELS, type Spot, type SpotAppearance } from "@/types/spot";

type SpotDetailProps = {
  spot: Spot;
};

// 出来事の出典を「リンク（既存詳細ページへ）」か「テキストのみ」かに分けて返す。
// FK が未設定（例: youtube/tv 等 mv/video/event/live 以外の種別、または
// 対応FKが空）の場合は null（出典行を省略）。
type SourceInfo =
  | { kind: "link"; href: string; label: string }
  | { kind: "text"; label: string };

function getSpotAppearanceSourceInfo(appearance: SpotAppearance): SourceInfo | null {
  switch (appearance.sourceType) {
    case "mv":
      if (!appearance.trackId) return null;
      return {
        kind: "link",
        href: `/songs/${appearance.trackId}`,
        label: appearance.trackTitle ?? "楽曲",
      };
    case "video": {
      // 動画自身に公開詳細ページは無いため、リンク先は親楽曲のページにする
      if (!appearance.videoTrackId) return null;
      const label = [
        appearance.videoTrackTitle ?? "楽曲",
        appearance.videoType ? getSongVideoTypeLabel(appearance.videoType) : null,
      ]
        .filter(Boolean)
        .join(" / ");
      return { kind: "link", href: `/songs/${appearance.videoTrackId}`, label };
    }
    case "live":
      if (!appearance.liveId) return null;
      return {
        kind: "link",
        href: `/lives/${appearance.liveId}`,
        label: appearance.liveName ?? "ライブ",
      };
    case "event": {
      // イベントに公開詳細ページは無いためテキスト表示のみ
      if (!appearance.eventId) return null;
      const label = [
        appearance.eventTitle,
        appearance.eventDate ? formatDate(appearance.eventDate) : null,
      ]
        .filter(Boolean)
        .join(" / ");
      return label ? { kind: "text", label } : null;
    }
    default:
      return null;
  }
}

function SpotAppearanceItem({ appearance }: { appearance: SpotAppearance }) {
  const sourceInfo = getSpotAppearanceSourceInfo(appearance);
  const typeLabel = [
    SPOT_SOURCE_TYPE_LABELS[appearance.sourceType],
    appearance.subtypeName,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <li className="rounded-lg border border-foreground/10 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {appearance.groupName && (
          <span className="text-foreground/50">{appearance.groupName}</span>
        )}
        <span className="font-medium text-foreground">{typeLabel}</span>
      </div>

      {sourceInfo && (
        <p className="mt-1">
          {sourceInfo.kind === "link" ? (
            <TextLink href={sourceInfo.href} className="text-sm">
              {sourceInfo.label}
            </TextLink>
          ) : (
            <span className="text-foreground/80">{sourceInfo.label}</span>
          )}
        </p>
      )}

      {appearance.members.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-2 text-foreground/80">
          {appearance.members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="hover:underline"
            >
              {member.name}
            </Link>
          ))}
        </p>
      )}

      {appearance.note && (
        <p className="mt-1 whitespace-pre-wrap text-foreground/70">
          {appearance.note}
        </p>
      )}

      {appearance.linkUrl && (
        <a
          href={appearance.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1 inline-block ${TEXT_LINK_CLASS}`}
        >
          リンク
        </a>
      )}
    </li>
  );
}

export function SpotDetail({ spot }: SpotDetailProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">{spot.name}</h1>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">場所情報</h2>
        <dl className="space-y-2 text-sm">
          {spot.prefecture && (
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-foreground/50">都道府県</dt>
              <dd className="text-foreground">{spot.prefecture}</dd>
            </div>
          )}
          {spot.address && (
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-foreground/50">住所</dt>
              <dd className="text-foreground">{spot.address}</dd>
            </div>
          )}
        </dl>
        {spot.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">
            {spot.description}
          </p>
        )}
        {spot.googleMapsUrl && (
          <a
            href={spot.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 inline-block ${TEXT_LINK_CLASS}`}
          >
            Googleマップで開く
          </a>
        )}
      </Card>

      <SpotLocationMap
        name={spot.name}
        latitude={spot.latitude}
        longitude={spot.longitude}
      />

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">
          出来事（{spot.appearances.length}件）
        </h2>
        {spot.appearances.length === 0 ? (
          <p className="text-sm text-foreground/50">登録された出来事はありません</p>
        ) : (
          <ul className="space-y-3">
            {spot.appearances.map((appearance) => (
              <SpotAppearanceItem key={appearance.id} appearance={appearance} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
