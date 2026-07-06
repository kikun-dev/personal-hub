"use client";

import type { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

// NEXT_PUBLIC_* はビルド時にインライン化されるため、静的なプロパティ参照で読む。
// 消費側はこの定数で「キー未設定時のフォールバック表示」を分岐する。
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Google Maps 系コンポーネント共通のプロバイダ。
// language/region を固定し、住所・都道府県（addressComponents）が
// ブラウザのロケールによらず日本語表記（例: 東京都）で返るようにする。
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="ja" region="JP">
      {children}
    </APIProvider>
  );
}
