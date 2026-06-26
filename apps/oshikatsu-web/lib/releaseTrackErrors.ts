import { RepositoryError } from "@/types/errors";

// 同一リリース内で曲順(track_number)が重複した場合のユニーク制約違反かを判定する
export function isDuplicateTrackNumberError(error: RepositoryError): boolean {
  const cause = error.cause as { code?: string; message?: string } | null;
  const message = cause?.message ?? "";
  return (
    cause?.code === "23505" &&
    message.includes("idx_orbit_release_tracks_unique_release_track_number")
  );
}

export const DUPLICATE_TRACK_NUMBER_MESSAGE =
  "その曲順は既に使われています。空欄にするとそのリリースの末尾に自動で追加されます。";
