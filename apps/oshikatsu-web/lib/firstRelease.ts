/**
 * 楽曲の初出リリース判定（ADR 0007 の追記 2026-07-26 / Issue #427）。
 *
 * 初出リリース = 紐づくリリースのうち最も古い非null のリリース日を持つもの。
 * 同日が複数ある場合は releaseId の昇順で決定的にタイブレークする。
 * リリース日が設定された紐づきリリースが1件も無い場合は「未確定」として null を返し、
 * 全リリースの参加者などへフォールバックしない。
 *
 * ドメイン判定であり、DB行からアプリ型への変換（Mapper）でも
 * UseCase でも同じ規則を使うため、層に属さない純関数として lib へ置く。
 */

export type DatedRelease = {
  releaseId: string;
  releaseDate: string | null;
};

/**
 * 初出リリースを1件返す。日付を持つ紐づきリリースが無ければ null。
 * 入力配列は変更しない。
 */
export function pickFirstDatedRelease<T extends DatedRelease>(
  releases: readonly T[]
): T | null {
  let first: T | null = null;

  for (const release of releases) {
    if (!release.releaseDate) continue;
    if (first === null) {
      first = release;
      continue;
    }

    // first.releaseDate は上の分岐で非null が確定している
    const dateCompare = release.releaseDate.localeCompare(first.releaseDate as string);
    if (dateCompare < 0) {
      first = release;
      continue;
    }
    // 同日は releaseId の昇順で決定的に選ぶ
    if (dateCompare === 0 && release.releaseId.localeCompare(first.releaseId) < 0) {
      first = release;
    }
  }

  return first;
}

/**
 * 初出リリースの releaseId を返す。未確定なら null。
 */
export function pickFirstReleaseId(releases: readonly DatedRelease[]): string | null {
  return pickFirstDatedRelease(releases)?.releaseId ?? null;
}
