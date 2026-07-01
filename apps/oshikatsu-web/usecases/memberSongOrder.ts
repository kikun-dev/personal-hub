import type { Song, SongReleaseLink } from "@/types/song";

// 楽曲の初出（最古リリース日）リンクを代表として選ぶ（同日は release.id で決定的に）。
function pickRepresentativeReleaseLink(
  releases: SongReleaseLink[]
): SongReleaseLink | null {
  let best: SongReleaseLink | null = null;
  for (const link of releases) {
    const date = link.releaseDate;
    if (!date) continue;
    if (
      !best ||
      date < (best.releaseDate ?? "") ||
      (date === best.releaseDate && link.releaseId < best.releaseId)
    ) {
      best = link;
    }
  }
  return best;
}

// メンバー参加楽曲を「リリース日昇順 → 曲順昇順」で並べる（未リリースは末尾）。
export function sortMemberSongsByReleaseOrder(songs: Song[]): Song[] {
  return [...songs].sort((a, b) => {
    const aRep = pickRepresentativeReleaseLink(a.releases);
    const bRep = pickRepresentativeReleaseLink(b.releases);

    const aHasDate = aRep !== null;
    const bHasDate = bRep !== null;
    if (aHasDate !== bHasDate) {
      return aHasDate ? -1 : 1;
    }

    if (aRep && bRep) {
      // 初出リリース日の昇順
      const dateCompare = (aRep.releaseDate ?? "").localeCompare(
        bRep.releaseDate ?? ""
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }
      // 同一リリース日は代表リリースごとにまとめる（決定的順序）
      if (aRep.releaseId !== bRep.releaseId) {
        return aRep.releaseId.localeCompare(bRep.releaseId);
      }
      // 同一リリース内は曲順の昇順
      if (aRep.trackNumber !== bRep.trackNumber) {
        return aRep.trackNumber - bRep.trackNumber;
      }
    }

    return a.title.localeCompare(b.title, "ja");
  });
}
