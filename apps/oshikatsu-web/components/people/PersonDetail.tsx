import Link from "next/link";
import type { Person, PersonCreditedSongSection } from "@/types/person";
import { PERSON_ROLE_LABELS } from "@/types/person";
import type { SongCreditRole } from "@/types/song";
import { Card } from "@/components/ui/Card";
import { GroupSectionHeading } from "@/components/ui/GroupSectionHeading";

type PersonDetailProps = {
  person: Person;
  sections: PersonCreditedSongSection[];
};

// 1曲での担当を表示用ラベルにする。作曲・編曲は1つにまとめ、両方なら「作曲・編曲」。
function creditRoleBadges(roles: SongCreditRole[]): string[] {
  const badges: string[] = [];
  if (roles.includes("lyrics")) badges.push("作詞");
  const hasMusic = roles.includes("music");
  const hasArrangement = roles.includes("arrangement");
  if (hasMusic && hasArrangement) badges.push("作曲・編曲");
  else if (hasMusic) badges.push("作曲");
  else if (hasArrangement) badges.push("編曲");
  if (roles.includes("choreography")) badges.push("振付");
  return badges;
}

export function PersonDetail({ person, sections }: PersonDetailProps) {
  const songCount = sections.reduce(
    (total, section) => total + section.songs.length,
    0
  );

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
          <span className="text-xs text-foreground/60">{songCount}曲</span>
        </div>

        {songCount === 0 ? (
          <p className="text-sm text-foreground/50">担当楽曲がありません</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.group?.id ?? "ungrouped"}
                className="space-y-2"
              >
                <GroupSectionHeading
                  color={section.group?.color}
                  name={section.group?.nameJa ?? "その他"}
                />
                <ul className="space-y-1">
                  {section.songs.map((song) => (
                    <li
                      key={song.trackId}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <Link
                        href={`/songs/${song.trackId}`}
                        className="text-foreground hover:underline"
                      >
                        {song.trackTitle}
                      </Link>
                      {creditRoleBadges(song.roles).map((badge) => (
                        <span
                          key={badge}
                          className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground/60"
                        >
                          {badge}
                        </span>
                      ))}
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
