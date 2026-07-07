import { RepositoryError } from "@/types/errors";

// slug（UNIQUE制約）が重複した場合のユニーク制約違反かを判定する
// （lib/releaseTrackErrors.ts の isDuplicateTrackNumberError と同型）。
// orbit_wiki_pages の UNIQUE 制約は slug のみのため、制約名（Postgres既定の
// "<table>_<column>_key" 命名）まで見て他の23505と混同しないようにする。
export function isDuplicateWikiSlugError(error: RepositoryError): boolean {
  const cause = error.cause as { code?: string; message?: string } | null;
  const message = cause?.message ?? "";
  return (
    cause?.code === "23505" && message.includes("orbit_wiki_pages_slug_key")
  );
}

export const DUPLICATE_WIKI_SLUG_MESSAGE = "このスラッグは既に使われています";
