import Link from "next/link";
import type { PersonDetail as PersonDetailData } from "@/types/person";
import { PERSON_ROLE_LABELS } from "@/types/person";
import type { SongCreditRole } from "@/types/song";
import { Card } from "@/components/ui/Card";

type PersonDetailProps = {
  detail: PersonDetailData;
};

// 1曲で作曲/編曲のどちらに関わったか（両方なら「作曲・編曲」）
function musicArrangementLabel(roles: SongCreditRole[]): string {
  const hasMusic = roles.includes("music");
  const hasArrangement = roles.includes("arrangement");
  if (hasMusic && hasArrangement) return "作曲・編曲";
  if (hasMusic) return "作曲";
  return "編曲";
}

export function PersonDetail({ detail }: PersonDetailProps) {
  const { person, creditedSongs } = detail;

  // 役割ごとに担当楽曲を分ける。作曲・編曲は同一セクションで、各曲にどちらかを明示する。
  const sections = [
    {
      key: "lyrics",
      title: "作詞",
      songs: creditedSongs.filter((song) => song.roles.includes("lyrics")),
      withMusicLabel: false,
    },
    {
      key: "music",
      title: "作曲・編曲",
      songs: creditedSongs.filter(
        (song) =>
          song.roles.includes("music") || song.roles.includes("arrangement")
      ),
      withMusicLabel: true,
    },
    {
      key: "choreography",
      title: "振付",
      songs: creditedSongs.filter((song) =>
        song.roles.includes("choreography")
      ),
      withMusicLabel: false,
    },
  ].filter((section) => section.songs.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">
          {person.displayName}
        </h1>
        {person.roles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground"
              >
                {PERSON_ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        )}
        {person.biography && (
          <p className="whitespace-pre-wrap text-sm text-foreground/70">
            {person.biography}
          </p>
        )}
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground/70">担当楽曲</h2>
          <span className="text-xs text-foreground/60">
            {creditedSongs.length}曲
          </span>
        </div>

        {creditedSongs.length === 0 ? (
          <p className="text-sm text-foreground/50">担当楽曲がありません</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.key} className="space-y-2">
                <p className="text-xs font-medium text-foreground/60">
                  {section.title}（{section.songs.length}曲）
                </p>
                <ul className="space-y-1">
                  {section.songs.map((song) => (
                    <li
                      key={`${section.key}-${song.trackId}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Link
                        href={`/songs/${song.trackId}`}
                        className="text-foreground hover:underline"
                      >
                        {song.trackTitle}
                      </Link>
                      {section.withMusicLabel && (
                        <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground/60">
                          {musicArrangementLabel(song.roles)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
