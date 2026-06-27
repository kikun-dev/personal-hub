import type { SongLabel, SongListItem, SongSection } from "@/types/song";

export function filterSongsByGroup(
  songs: SongListItem[],
  groupId: string
): SongListItem[] {
  if (groupId === "") {
    return songs;
  }
  return songs.filter((song) => song.groupId === groupId);
}

export function filterSongsByLabel(
  songs: SongListItem[],
  label: SongLabel | ""
): SongListItem[] {
  if (label === "") {
    return songs;
  }
  return songs.filter((song) => song.label === label);
}

export function filterSongsByGeneration(
  songs: SongListItem[],
  generation: string
): SongListItem[] {
  if (generation === "") {
    return songs;
  }
  return songs.filter(
    (song) => song.label === "generation" && song.generation === generation
  );
}

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

export function filterSongSectionsByLabel(
  sections: SongSection[],
  label: SongLabel | ""
): SongSection[] {
  if (label === "") {
    return sections;
  }
  return sections
    .map((section) => ({
      ...section,
      songs: section.songs.filter((song) => song.label === label),
    }))
    .filter((section) => section.songs.length > 0);
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
