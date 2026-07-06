"use client";

import { Map, Marker } from "@vis.gl/react-google-maps";
import {
  GOOGLE_MAPS_API_KEY,
  GoogleMapsProvider,
} from "@/components/ui/GoogleMapsProvider";

type SpotLocationMapProps = {
  name: string;
  latitude: number;
  longitude: number;
};

// スポット単一ピンの小さい地図。API キー未設定時は SpotsMapView と同じ方針で
// 地図自体を描画しない（呼び出し側はフォールバック文言を出さない＝スキップ）。
export function SpotLocationMap({
  name,
  latitude,
  longitude,
}: SpotLocationMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const position = { lat: latitude, lng: longitude };

  return (
    <div className="h-[40vh] w-full overflow-hidden rounded-lg border border-foreground/10">
      <GoogleMapsProvider>
        <Map
          defaultCenter={position}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <Marker position={position} title={name} />
        </Map>
      </GoogleMapsProvider>
    </div>
  );
}
