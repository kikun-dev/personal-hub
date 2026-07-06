"use client";

import { Input } from "@/components/ui/Input";
import { PREFECTURES, isPrefecture } from "@/lib/prefectures";
import {
  SpotPlaceSearch,
  type SpotPlaceSearchResult,
} from "@/components/admin/SpotPlaceSearch";

export const OVERSEAS_VALUE = "__overseas__";

const inputClass =
  "w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20";

type SpotLocationSectionProps = {
  isOverseas: boolean;
  name: string;
  prefecture: string;
  address: string;
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  errors: Record<string, string>;
  onPlaceSelect: (result: SpotPlaceSearchResult) => void;
  onNameChange: (value: string) => void;
  onPrefectureSelect: (selected: string) => void;
  onOverseasPrefectureChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onGoogleMapsUrlChange: (value: string) => void;
};

export function SpotLocationSection({
  isOverseas,
  name,
  prefecture,
  address,
  latitude,
  longitude,
  googleMapsUrl,
  errors,
  onPlaceSelect,
  onNameChange,
  onPrefectureSelect,
  onOverseasPrefectureChange,
  onAddressChange,
  onLatitudeChange,
  onLongitudeChange,
  onGoogleMapsUrlChange,
}: SpotLocationSectionProps) {
  // 都道府県が空でなく47に無い＝海外（地域名手入力）。VenueForm と同じパターン。
  const selectValue = isOverseas
    ? OVERSEAS_VALUE
    : isPrefecture(prefecture)
      ? prefecture
      : "";

  return (
    <>
      <SpotPlaceSearch onSelect={onPlaceSelect} />

      <Input
        id="name"
        label="スポット名*"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        error={errors.name}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          都道府県
        </label>
        <select
          value={selectValue}
          onChange={(e) => onPrefectureSelect(e.target.value)}
          className={inputClass}
        >
          <option value="">未選択</option>
          {PREFECTURES.map((prefectureOption) => (
            <option key={prefectureOption} value={prefectureOption}>
              {prefectureOption}
            </option>
          ))}
          <option value={OVERSEAS_VALUE}>海外</option>
        </select>
        {isOverseas && (
          <input
            value={prefecture}
            onChange={(e) => onOverseasPrefectureChange(e.target.value)}
            placeholder="国・地域名（例: 台湾）"
            className={`mt-2 ${inputClass}`}
          />
        )}
        {errors.prefecture && (
          <p className="mt-1 text-xs text-red-500">{errors.prefecture}</p>
        )}
      </div>

      <Input
        id="address"
        label="住所"
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        error={errors.address}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="latitude"
          label="緯度*"
          value={latitude}
          onChange={(e) => onLatitudeChange(e.target.value)}
          error={errors.latitude}
        />
        <Input
          id="longitude"
          label="経度*"
          value={longitude}
          onChange={(e) => onLongitudeChange(e.target.value)}
          error={errors.longitude}
        />
      </div>

      <Input
        id="googleMapsUrl"
        label="Googleマップのリンク"
        value={googleMapsUrl}
        onChange={(e) => onGoogleMapsUrlChange(e.target.value)}
        error={errors.googleMapsUrl}
      />
    </>
  );
}
