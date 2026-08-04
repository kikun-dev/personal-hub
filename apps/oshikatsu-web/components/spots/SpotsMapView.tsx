"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InfoWindow, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { textLinkClass } from "@/components/ui/interactionStyles";
import { TextLink } from "@/components/ui/TextLink";
import {
  GOOGLE_MAPS_API_KEY,
  GoogleMapsProvider,
} from "@/components/ui/GoogleMapsProvider";
import { APP_ROUTES } from "@/lib/routes";
import { replaceListFilterParams } from "@/lib/listFilterUrl";
import {
  collectSpotPrefectures,
  filterSpotsByPrefecture,
  filterSpotsBySourceType,
  searchSpots,
} from "@/usecases/spotFilters";
import {
  SPOT_SOURCE_TYPES,
  SPOT_SOURCE_TYPE_LABELS,
  type SpotListItem,
} from "@/types/spot";
import type { MemberOption } from "@/types/member";

type SpotsMapViewProps = {
  spots: SpotListItem[];
  memberOptions: MemberOption[];
  isAdmin: boolean;
};

// ピンが0件のときのフォールバック表示（日本全体が収まる程度）
const JAPAN_CENTER = { lat: 36.2, lng: 138.2 };
const JAPAN_ZOOM = 5;
// ユニーク座標が1点だけのとき fitBounds は最大ズームまで寄ってしまうため、
// 固定ズームでセンタリングする
const SINGLE_POINT_ZOOM = 15;

// Google Maps の InfoWindow はページの theme に追随しない白い外部 surface なので、
// この subtree だけを固定 light 配色の semantic contract として自己完結させる。
// 要素ごとに raw color を割り当てず、既存の semantic class / textLinkClass が
// 参照する custom property をこの境界でまとめて差し替える。
const INFO_WINDOW_SEMANTIC_CONTRACT =
  "bg-background text-foreground [--background:#fff] [--focus-ring:#1d4ed8] [--foreground:#171717] [--foreground-secondary:#595959]";

// フィルタ変更・初期表示のたびに全ピンが収まる範囲へフィットする。
// Map コンポーネントの子として描画し、useMap() で親の Map インスタンスを取得する。
function MapBoundsFitter({ spots }: { spots: SpotListItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (spots.length === 0) {
      map.setCenter(JAPAN_CENTER);
      map.setZoom(JAPAN_ZOOM);
      return;
    }

    // 同一座標のスポットが複数あっても bounds の面積はゼロになるため、
    // 件数ではなくユニーク座標数で判定する
    const uniquePositions = new Set(
      spots.map((spot) => `${spot.latitude},${spot.longitude}`)
    );
    if (uniquePositions.size === 1) {
      map.setCenter({ lat: spots[0].latitude, lng: spots[0].longitude });
      map.setZoom(SINGLE_POINT_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const spot of spots) {
      bounds.extend({ lat: spot.latitude, lng: spot.longitude });
    }
    map.fitBounds(bounds);
  }, [map, spots]);

  return null;
}

// 一覧の行クリックによる「この場所へ寄せて」という明示的な要求。
// InfoWindow 用の選択 state（ピンクリックでも変わる）とは分離し、ピンクリックや
// フィルタ変更で意図しない panTo / 強制ズームが発火しないようにする。
// 同じ行の再クリックでも再パンさせるため、クリックごとに新しいオブジェクトを作る。
type SpotFocusRequest = {
  spot: SpotListItem;
};

// 行クリック（地図移動、#292）を受けて、要求されたスポットへ地図を寄せる。
// MapBoundsFitter と同様、Map の子として描画し useMap() で親のインスタンスを取得する。
function MapSpotFocuser({ request }: { request: SpotFocusRequest | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !request) return;

    map.panTo({ lat: request.spot.latitude, lng: request.spot.longitude });
    const currentZoom = map.getZoom();
    if (currentZoom === undefined || currentZoom < SINGLE_POINT_ZOOM) {
      map.setZoom(SINGLE_POINT_ZOOM);
    }
  }, [map, request]);

  return null;
}

function SpotInfoWindowContent({
  spot,
  isAdmin,
}: {
  spot: SpotListItem;
  isAdmin: boolean;
}) {
  const subtypeNames = Array.from(
    new Set(
      spot.appearanceTags.flatMap((tag) =>
        tag.subtypeName !== null ? [tag.subtypeName] : []
      )
    )
  );

  // #469: .gm-style-iw は light / dark とも白で theme 非追随と実測済み。
  // Google の内部 class へ CSS を当てず、コンテンツ側が固定 light surface と対応する
  // foreground を所有する。上のローカル contract を theme 追従 token へ戻さないこと。
  return (
    <div
      data-ui="spot-info-window"
      className={`space-y-1 py-1 text-sm ${INFO_WINDOW_SEMANTIC_CONTRACT}`}
    >
      <p className="font-bold">{spot.name}</p>
      {spot.sourceTypes.length > 0 && (
        <p className="text-foreground-secondary">
          {spot.sourceTypes
            .map((sourceType) => SPOT_SOURCE_TYPE_LABELS[sourceType])
            .join("、")}
        </p>
      )}
      {subtypeNames.length > 0 && (
        <p className="text-foreground-secondary">{subtypeNames.join("、")}</p>
      )}
      {spot.prefecture && (
        <p className="text-foreground-secondary">{spot.prefecture}</p>
      )}
      {spot.googleMapsUrl && (
        <a
          href={spot.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`block ${textLinkClass}`}
        >
          Googleマップで開く
        </a>
      )}
      <TextLink href={`/spots/${spot.id}`} className="block">
        詳細を見る
      </TextLink>
      {isAdmin && (
        <TextLink href={`/spots/${spot.id}/edit`} prefetch={false} className="block">
          編集
        </TextLink>
      )}
    </div>
  );
}

export function SpotsMapView({ spots, memberOptions, isAdmin }: SpotsMapViewProps) {
  // 即時反映は local state、戻る/リロード等の URL 変化は useEffect で同期する
  // （LiveBrowser / SongBrowser と同じパターン）
  const searchParams = useSearchParams();
  const urlSourceType = searchParams.get("type") ?? "";
  const urlPrefecture = searchParams.get("prefecture") ?? "";
  const [sourceType, setSourceType] = useState(urlSourceType);
  const [prefecture, setPrefecture] = useState(urlPrefecture);
  // テキスト検索（スポット名・サブ種別・メンバー名）は SongBrowser のタイトル検索と
  // 同じく URL 非同期の一時状態にする
  const [query, setQuery] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<SpotFocusRequest | null>(null);
  // 行クリックで地図へスクロールするための地図コンテナ参照。
  // API キー未設定時は地図自体を描画しないため ref は常に null のまま
  // （GOOGLE_MAPS_API_KEY で分岐して何もしない）。
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSourceType(urlSourceType);
  }, [urlSourceType]);
  useEffect(() => {
    setPrefecture(urlPrefecture);
  }, [urlPrefecture]);

  const prefectureOptions = useMemo(() => collectSpotPrefectures(spots), [spots]);

  // テキスト検索でメンバー名を引くための id → 表示名マップ。
  // このファイルでは Map が @vis.gl/react-google-maps のコンポーネント名に
  // 隠されるため、組み込みの Map は globalThis 経由で参照する。
  const memberNameById = useMemo(
    () =>
      new globalThis.Map<string, string>(
        memberOptions.map((member) => [member.id, member.nameJa])
      ),
    [memberOptions]
  );

  const filteredSpots = useMemo(
    () =>
      searchSpots(
        filterSpotsByPrefecture(
          filterSpotsBySourceType(spots, sourceType),
          prefecture
        ),
        query,
        memberNameById
      ),
    [spots, sourceType, prefecture, query, memberNameById]
  );

  const selectedSpot =
    filteredSpots.find((spot) => spot.id === selectedSpotId) ?? null;

  const handleSourceTypeChange = (nextSourceType: string) => {
    setSourceType(nextSourceType);
    setSelectedSpotId(null);
    setFocusRequest(null);
    replaceListFilterParams({ type: nextSourceType });
  };

  const handlePrefectureChange = (nextPrefecture: string) => {
    setPrefecture(nextPrefecture);
    setSelectedSpotId(null);
    setFocusRequest(null);
    replaceListFilterParams({ prefecture: nextPrefecture });
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setSelectedSpotId(null);
    setFocusRequest(null);
  };

  // 行クリック = 地図移動（#292 案A）。スポット名リンク（詳細遷移）とは
  // stopPropagation で切り分ける。地図が無ければ何もしない。
  const handleRowClick = (spot: SpotListItem) => {
    if (!GOOGLE_MAPS_API_KEY) return;
    setSelectedSpotId(spot.id);
    setFocusRequest({ spot });
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sourceType}
          onChange={(event) => handleSourceTypeChange(event.target.value)}
          aria-label="種別で絞り込み"
          className="rounded-lg border border-border-strong bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">すべて</option>
          {SPOT_SOURCE_TYPES.map((value) => (
            <option key={value} value={value}>
              {SPOT_SOURCE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={prefecture}
          onChange={(event) => handlePrefectureChange(event.target.value)}
          aria-label="都道府県で絞り込み"
          className="rounded-lg border border-border-strong bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全都道府県</option>
          {prefectureOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="名前・サブ種別・メンバーで検索"
          aria-label="スポット名・サブ種別・メンバー名で検索"
          className="w-full max-w-xs rounded-lg border border-border-strong bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-secondary"
        />
        <span className="ml-auto shrink-0 text-sm text-foreground-secondary">
          {filteredSpots.length}件
        </span>
      </div>

      {GOOGLE_MAPS_API_KEY ? (
        <div
          ref={mapContainerRef}
          className="h-[60vh] w-full overflow-hidden rounded-lg border border-border-subtle"
        >
          <GoogleMapsProvider>
            <Map
              defaultCenter={JAPAN_CENTER}
              defaultZoom={JAPAN_ZOOM}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              <MapBoundsFitter spots={filteredSpots} />
              <MapSpotFocuser request={focusRequest} />
              {filteredSpots.map((spot) => (
                <Marker
                  key={spot.id}
                  position={{ lat: spot.latitude, lng: spot.longitude }}
                  onClick={() => setSelectedSpotId(spot.id)}
                />
              ))}
              {selectedSpot && (
                <InfoWindow
                  position={{
                    lat: selectedSpot.latitude,
                    lng: selectedSpot.longitude,
                  }}
                  onCloseClick={() => setSelectedSpotId(null)}
                >
                  <SpotInfoWindowContent spot={selectedSpot} isAdmin={isAdmin} />
                </InfoWindow>
              )}
            </Map>
          </GoogleMapsProvider>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-foreground-secondary">
          Google MapsのAPIキーが未設定のため、地図は表示できません。一覧のみ表示します。
        </p>
      )}

      {filteredSpots.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground-secondary">
          該当するスポットがありません
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="pb-2 pr-4 font-medium text-foreground-secondary">名前</th>
                <th className="pb-2 pr-4 font-medium text-foreground-secondary">種別</th>
                <th className="pb-2 pr-4 font-medium text-foreground-secondary">
                  都道府県
                </th>
                {isAdmin && (
                  <th className="pb-2 font-medium text-foreground-secondary">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredSpots.map((spot) => (
                <tr
                  key={spot.id}
                  onClick={() => handleRowClick(spot)}
                  // クリッカブルに見える行はキーボードでも操作できるようにする
                  tabIndex={GOOGLE_MAPS_API_KEY ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowClick(spot);
                    }
                  }}
                  // 行は tabIndex={0} でキーボードフォーカスを受ける。focus を面の変化だけで示すと
                  // surface-subtle と背景のコントラストが light 1.11:1 / dark 1.16:1 しかなく、
                  // DESIGN.md の「focus indicator は3:1以上」を満たさない（#468 レビュー指摘）。
                  //
                  // ただし他の17箇所が使う focusRingClass（outline 2px + offset 2px）はここでは使えない。
                  // この table は overflow-x-auto の中にあり、片軸が auto だともう片軸の visible も
                  // auto に計算されるため上下左右すべてで clip 境界になる（#441 と同じ構造）。
                  // 実測では行の左右クリアランスが 0px、最終行の下が 0.5px しかなく、外側 4px を要求する
                  // ring は確実に切られる。
                  //
                  // そこで offset を内側（-2px）にして ring を行の box 内へ描く。色は同じ focus-ring
                  // token（light #1D4ED8 / dark #93C5FD）で、背景に対して 6.70:1 / 10.98:1 と 3:1 を満たす。
                  // 面の変化は補助表現として残す。
                  className={`border-b border-border-subtle ${
                    GOOGLE_MAPS_API_KEY
                      ? "cursor-pointer hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring"
                      : ""
                  }`}
                >
                  <td className="py-2 pr-4 text-foreground">
                    <TextLink
                      href={`/spots/${spot.id}`}
                      listBackFallbackHref={APP_ROUTES.spots}
                      className="text-sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {spot.name}
                    </TextLink>
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {spot.sourceTypes.length > 0
                      ? spot.sourceTypes
                          .map((sourceType) => SPOT_SOURCE_TYPE_LABELS[sourceType])
                          .join("、")
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {spot.prefecture ?? "—"}
                  </td>
                  {isAdmin && (
                    <td className="py-2">
                      <TextLink
                        href={`/spots/${spot.id}/edit`}
                        prefetch={false}
                        className="text-sm"
                        onClick={(event) => event.stopPropagation()}
                      >
                        編集
                      </TextLink>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
