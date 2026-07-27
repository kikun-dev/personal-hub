import { withInitialKey } from "@/lib/keyedList";
import type { CreateSpotAppearanceInput, CreateSpotInput } from "@/types/spot";
import type { AppearanceField } from "@/components/admin/spot/spotFormShared";
import {
  type FormSpotPhoto,
} from "@/components/admin/spot/SpotPhotosSection";

/**
 * SpotForm.tsx から切り出した、FormValues の生成・相互変換を担う純粋関数群。
 * JSX を持たないため SpotForm.tsx からのみ import される（セクション child からは使わない）。
 */

export type FormValues = Omit<CreateSpotInput, "appearances" | "photos"> & {
  appearances: AppearanceField[];
  photos: FormSpotPhoto[];
};

export function getDefaultAppearance(): CreateSpotAppearanceInput {
  return {
    sourceType: "",
    groupId: "",
    trackId: "",
    videoId: "",
    eventId: "",
    liveId: "",
    subtypeName: "",
    note: "",
    linkUrl: "",
    memberIds: [],
  };
}

export function getDefaultValues(): FormValues {
  return {
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    address: "",
    prefecture: "",
    googlePlaceId: "",
    googleMapsUrl: "",
    // 出来事1件以上必須（#286）のため、create の初期値に空行を1件入れておく。
    // 初期行は SSR / hydration で同一のキーにする（#443）
    appearances: [withInitialKey(getDefaultAppearance(), 0, "appearance")],
    photos: [],
  };
}

export function toFormValues(input: CreateSpotInput): FormValues {
  return {
    ...input,
    // 初期行は SSR / hydration で同一のキーにする（#443）。写真も同様
    appearances: input.appearances.map((appearance, index) =>
      withInitialKey(appearance, index, "appearance")
    ),
    photos: input.photos.map((photo, index) =>
      withInitialKey(photo, index, "photo")
    ),
  };
}

export function toSubmitValues(values: FormValues): CreateSpotInput {
  return {
    ...values,
    appearances: values.appearances.map((appearance) => ({
      sourceType: appearance.sourceType,
      groupId: appearance.groupId,
      trackId: appearance.trackId,
      videoId: appearance.videoId,
      eventId: appearance.eventId,
      liveId: appearance.liveId,
      subtypeName: appearance.subtypeName,
      note: appearance.note,
      linkUrl: appearance.linkUrl,
      memberIds: appearance.memberIds,
    })),
    photos: values.photos.map((photo) => ({
      imagePath: photo.imagePath,
      caption: photo.caption,
    })),
  };
}
