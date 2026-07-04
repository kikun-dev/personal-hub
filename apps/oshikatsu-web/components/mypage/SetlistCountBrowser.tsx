"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import { getSetlistCount } from "@/usecases/getSetlistCount";
import { SetlistRankingList } from "@/components/mypage/SetlistRankingList";
import { SetlistUnencounteredList } from "@/components/mypage/SetlistUnencounteredList";
import { PendingLink } from "@/components/ui/PendingLink";
import { APP_ROUTES } from "@/lib/routes";
import type { AttendedType, SongEncounter } from "@/types/attendance";
import { ATTENDED_TYPE_LABELS } from "@/types/attendance";
import type { Group } from "@/types/group";
import type { SongLabel, SongListItem } from "@/types/song";
import { SONG_LABELS, SONG_LABEL_LABELS, isSongLabel } from "@/types/song";

type SetlistView = "ranking" | "unencountered";

// 「現地」は常時カウント対象（Issue #249 Decision）。LV / 配信はチェックで追加する
// 任意の参戦種別。
const OPTIONAL_ATTENDED_TYPES = ["live_viewing", "streaming"] as const satisfies readonly AttendedType[];
type OptionalAttendedType = (typeof OPTIONAL_ATTENDED_TYPES)[number];

function toLabel(value: string | null): SongLabel | "" {
  return value && isSongLabel(value) ? value : "";
}

function toView(value: string | null): SetlistView {
  return value === "unencountered" ? "unencountered" : "ranking";
}

function parseOptionalTypes(value: string): OptionalAttendedType[] {
  if (!value) return [];
  const values = value.split(",");
  return OPTIONAL_ATTENDED_TYPES.filter((type) => values.includes(type));
}

type SetlistCountBrowserProps = {
  groups: Group[];
  songs: SongListItem[];
  encounters: SongEncounter[];
};

export function SetlistCountBrowser({
  groups,
  songs,
  encounters,
}: SetlistCountBrowserProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は searchParams から都度導出する
  // （SongBrowser と同じ「URL params ⇄ local state」の慣習に合わせる）。
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("group") ?? "";
  const urlLabel = toLabel(searchParams.get("label"));
  const urlView = toView(searchParams.get("view"));
  const urlTypesParam = searchParams.get("types") ?? "";
  const urlIncludeOther = searchParams.get("includeOther") === "1";

  const [groupId, setGroupId] = useState(urlGroupId);
  const [label, setLabel] = useState<SongLabel | "">(urlLabel);
  const [view, setView] = useState<SetlistView>(urlView);
  const [optionalTypes, setOptionalTypes] = useState<OptionalAttendedType[]>(() =>
    parseOptionalTypes(urlTypesParam)
  );
  // 「その他」楽曲を含めるかどうか（既定off、SongBrowser と同じ絞り込み、#264）
  const [includeOther, setIncludeOther] = useState(urlIncludeOther);
  // タイトル検索は URL 非同期の一時状態（SongBrowser の query と同じ扱い）
  const [query, setQuery] = useState("");

  // 戻る/リロード等で URL が変わった場合の再同期（SongBrowser と同じ慣習）。
  // optionalTypes は urlTypesParam（文字列プリミティブ）を依存にし、
  // parseOptionalTypes が毎回新しい配列を返しても無限ループにならないようにする。
  useEffect(() => {
    setGroupId(urlGroupId);
  }, [urlGroupId]);
  useEffect(() => {
    setLabel(urlLabel);
  }, [urlLabel]);
  useEffect(() => {
    setView(urlView);
  }, [urlView]);
  useEffect(() => {
    setOptionalTypes(parseOptionalTypes(urlTypesParam));
  }, [urlTypesParam]);
  useEffect(() => {
    setIncludeOther(urlIncludeOther);
  }, [urlIncludeOther]);

  const attendedTypes = useMemo<AttendedType[]>(
    () => ["onsite", ...optionalTypes],
    [optionalTypes]
  );

  const isGroupFiltered = groupId !== "";
  // SongBrowser と同じ除外ロジック：全グループ表示かつトグルoffのときのみ
  // 「その他」楽曲を母集合から除外する。特定グループ選択時（その他選択を含む）は
  // getSetlistCount 内の filterSongsByGroup が絞り込むのでそのまま渡す。
  const baseSongs = useMemo(
    () => (includeOther || isGroupFiltered ? songs : songs.filter((song) => !song.isCatchall)),
    [songs, includeOther, isGroupFiltered]
  );

  const result = useMemo(
    () =>
      getSetlistCount(encounters, baseSongs, {
        attendedTypes,
        groupId,
        label,
        query,
      }),
    [encounters, baseSongs, attendedTypes, groupId, label, query]
  );

  const hasAnyEncounter = encounters.length > 0;

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    replaceListFilterParams({ group: nextGroupId });
  };

  const handleLabelChange = (nextLabel: SongLabel | "") => {
    setLabel(nextLabel);
    replaceListFilterParams({ label: nextLabel });
  };

  const handleViewChange = (nextView: SetlistView) => {
    setView(nextView);
    replaceListFilterParams({ view: nextView === "ranking" ? "" : nextView });
  };

  const handleToggleType = (type: OptionalAttendedType) => {
    const next = optionalTypes.includes(type)
      ? optionalTypes.filter((value) => value !== type)
      : [...optionalTypes, type];
    setOptionalTypes(next);
    replaceListFilterParams({ types: next.join(",") });
  };

  const handleIncludeOtherChange = (nextIncludeOther: boolean) => {
    setIncludeOther(nextIncludeOther);
    replaceListFilterParams({ includeOther: nextIncludeOther ? "1" : "" });
  };

  // encounters は「参戦記録 × セットリスト登録曲」の展開結果。
  // 参戦記録があってもセットリスト未登録・テキスト曲のみの場合は0件になるため、
  // 「参戦記録がない」とは断定せず、遭遇記録が無い旨の文言にする。
  if (!hasAnyEncounter) {
    return (
      <p className="py-12 text-center text-sm text-foreground/60">
        セットリストが登録された参戦記録がまだありません。
        <PendingLink
          href={APP_ROUTES.lives}
          feedback="global"
          className="ml-1 text-blue-500 hover:underline"
        >
          ライブ一覧
        </PendingLink>
        から参戦記録を登録するか、公演のセットリストを登録すると集計されます。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={groupId}
          onChange={(event) => handleGroupChange(event.target.value)}
          aria-label="グループで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全グループ</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.nameJa}
            </option>
          ))}
        </select>
        <select
          value={label}
          onChange={(event) => handleLabelChange(event.target.value as SongLabel | "")}
          aria-label="ラベルで絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全ラベル</option>
          {SONG_LABELS.map((value) => (
            <option key={value} value={value}>
              {SONG_LABEL_LABELS[value]}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトルで検索"
          aria-label="楽曲タイトルで検索"
          className="w-full max-w-xs rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30"
        />
        <label className="flex items-center gap-1.5 text-sm text-foreground/70">
          <input
            type="checkbox"
            checked={includeOther}
            onChange={(event) => handleIncludeOtherChange(event.target.checked)}
          />
          その他も含む
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/70">
          <span className="text-xs text-foreground/50">参戦種別</span>
          <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs text-foreground">
            {ATTENDED_TYPE_LABELS.onsite}
          </span>
          {OPTIONAL_ATTENDED_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={optionalTypes.includes(type)}
                onChange={() => handleToggleType(type)}
              />
              {ATTENDED_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleViewChange("ranking")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              view === "ranking"
                ? "bg-foreground text-background"
                : "border border-foreground/10 text-foreground/60 hover:bg-foreground/5"
            }`}
          >
            ランキング（{result.ranking.length}曲）
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("unencountered")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              view === "unencountered"
                ? "bg-foreground text-background"
                : "border border-foreground/10 text-foreground/60 hover:bg-foreground/5"
            }`}
          >
            未遭遇（{result.unencountered.length}曲）
          </button>
        </div>
      </div>

      {view === "ranking" ? (
        <SetlistRankingList entries={result.ranking} />
      ) : (
        <SetlistUnencounteredList songs={result.unencountered} />
      )}
    </div>
  );
}
