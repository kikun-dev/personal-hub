"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  GOOGLE_MAPS_API_KEY,
  GoogleMapsProvider,
} from "@/components/ui/GoogleMapsProvider";

export type SpotPlaceSearchResult = {
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  prefecture: string;
  googlePlaceId: string;
  googleMapsUrl: string;
};

type SpotPlaceSearchProps = {
  onSelect: (result: SpotPlaceSearchResult) => void;
};

// 住所コンポーネントから都道府県（administrative_area_level_1）の long text を取り出す。
// 該当が無い（海外の住所など）場合は空文字を返し、フォーム側の手入力に委ねる。
function extractPrefecture(
  components: google.maps.places.AddressComponent[] | undefined
): string {
  const prefectureComponent = components?.find((component) =>
    component.types.includes("administrative_area_level_1")
  );
  return prefectureComponent?.longText ?? "";
}

function PlaceAutocompleteField({ onSelect }: SpotPlaceSearchProps) {
  const placesLibrary = useMapsLibrary("places");
  const containerRef = useRef<HTMLDivElement>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // onSelect の identity 変化のたびにウィジェットを作り直さないよう ref 経由で参照する
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    // 新API（PlaceAutocompleteElement）のみ使用可（このプロジェクトのAPIキーは
    // レガシー Autocomplete / AutocompleteService 非対応の Places API (New) のみ許可）。
    const element = new placesLibrary.PlaceAutocompleteElement();
    container.appendChild(element);

    const handleSelect = async (
      event: google.maps.places.PlacePredictionSelectEvent
    ) => {
      setFetchError(null);
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "googleMapsURI",
            "addressComponents",
          ],
        });

        onSelectRef.current({
          name: place.displayName ?? "",
          latitude: place.location ? String(place.location.lat()) : "",
          longitude: place.location ? String(place.location.lng()) : "",
          address: place.formattedAddress ?? "",
          prefecture: extractPrefecture(place.addressComponents),
          googlePlaceId: place.id,
          googleMapsUrl: place.googleMapsURI ?? "",
        });
      } catch {
        // Places API の失敗（ネットワーク・クォータ・キー制限など）を無言で
        // 握りつぶさず、手入力への誘導を表示する
        setFetchError(
          "場所情報の取得に失敗しました。もう一度試すか、下の項目を手入力してください。"
        );
      }
    };

    element.addEventListener("gmp-select", handleSelect);

    return () => {
      // @types/google.maps は PlaceAutocompleteElement.addEventListener だけを
      // gmp-select 対応でオーバーロードしており、removeEventListener は
      // HTMLElement 由来の汎用オーバーロードのみのため "gmp-select" が型エラーになる
      // （実行時の挙動は addEventListener と対称で問題ない）。
      element.removeEventListener(
        "gmp-select",
        handleSelect as unknown as EventListener
      );
      container.removeChild(element);
    };
  }, [placesLibrary]);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground/70">
        場所を検索
      </label>
      <div
        ref={containerRef}
        className="[&>gmp-place-autocomplete]:w-full"
      />
      {fetchError && <p className="mt-1 text-xs text-red-500">{fetchError}</p>}
      <p className="mt-1 text-xs text-foreground/40">
        検索して選択すると、名前・緯度経度・住所・都道府県が自動入力されます（後から手動修正できます）
      </p>
    </div>
  );
}

export function SpotPlaceSearch({ onSelect }: SpotPlaceSearchProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="rounded-lg border border-dashed border-foreground/20 px-3 py-2 text-xs text-foreground/50">
        Google MapsのAPIキーが未設定のため、場所検索は利用できません。下の項目を手入力してください。
      </p>
    );
  }

  return (
    <GoogleMapsProvider>
      <PlaceAutocompleteField onSelect={onSelect} />
    </GoogleMapsProvider>
  );
}
