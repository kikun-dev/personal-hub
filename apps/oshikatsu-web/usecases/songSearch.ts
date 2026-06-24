import type { SongListItem, SongSection } from "@/types/song";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesTitle(title: string, normalizedQuery: string): boolean {
  return title.toLowerCase().includes(normalizedQuery);
}

export function filterSongsByTitle(
  songs: SongListItem[],
  query: string
): SongListItem[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery === "") {
    return songs;
  }
  return songs.filter((song) => matchesTitle(song.title, normalizedQuery));
}

export function filterSongSectionsByTitle(
  sections: SongSection[],
  query: string
): SongSection[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery === "") {
    return sections;
  }
  return sections
    .map((section) => ({
      ...section,
      songs: section.songs.filter((song) =>
        matchesTitle(song.title, normalizedQuery)
      ),
    }))
    .filter((section) => section.songs.length > 0);
}
