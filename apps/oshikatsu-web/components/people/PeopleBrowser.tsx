"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TextLink } from "@/components/ui/TextLink";
import { SortableTh } from "@/components/ui/SortableTh";
import { useTableSort, type SortableColumn } from "@/lib/useTableSort";
import type { PersonListItem, PersonRole } from "@/types/person";
import { PERSON_ROLE_LABELS, PERSON_ROLE_VALUES } from "@/types/person";

type SortKey = "name" | "songCount";

const PEOPLE_COLUMNS: readonly SortableColumn<PersonListItem, SortKey>[] = [
  { key: "name", label: "名前", sortValue: (p) => p.displayName },
  { key: "songCount", label: "担当曲数", sortValue: (p) => p.songCount },
];

function peopleTiebreak(a: PersonListItem, b: PersonListItem): number {
  return a.displayName.localeCompare(b.displayName, "ja");
}

type PeopleBrowserProps = {
  people: PersonListItem[];
  isAdmin: boolean;
};

export function PeopleBrowser({ people, isAdmin }: PeopleBrowserProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<PersonRole | "">("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return people.filter((person) => {
      const matchesQuery =
        keyword === "" || person.displayName.toLowerCase().includes(keyword);
      const matchesRole = role === "" || person.roles.includes(role);
      return matchesQuery && matchesRole;
    });
  }, [people, query, role]);

  const { sorted, sortKey, sortDir, handleSort, ariaSort } = useTableSort(
    filtered,
    PEOPLE_COLUMNS,
    { initialKey: "songCount", initialDir: "desc", tiebreak: peopleTiebreak }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名前で検索"
          aria-label="名前で検索"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as PersonRole | "")}
          aria-label="担当で絞り込み"
          className="rounded-lg border border-foreground/10 bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">全担当</option>
          {PERSON_ROLE_VALUES.map((value) => (
            <option key={value} value={value}>
              {PERSON_ROLE_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="ml-auto shrink-0 text-sm text-foreground/50">
          {sorted.length}人
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <SortableTh
                label="名前"
                active={sortKey === "name"}
                dir={sortDir}
                ariaSort={ariaSort("name")}
                onSort={() => handleSort("name")}
              />
              <th className="pb-2 pr-4 font-medium text-foreground/70">担当</th>
              <SortableTh
                label="担当曲数"
                active={sortKey === "songCount"}
                dir={sortDir}
                ariaSort={ariaSort("songCount")}
                onSort={() => handleSort("songCount")}
              />
              {isAdmin && (
                <th className="pb-2 font-medium text-foreground/70">操作</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((person) => (
              <tr key={person.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-foreground hover:underline"
                  >
                    {person.displayName}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {person.roles.length > 0 ? (
                      person.roles.map((personRole) => (
                        <span
                          key={`${person.id}-${personRole}`}
                          className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground"
                        >
                          {PERSON_ROLE_LABELS[personRole]}
                        </span>
                      ))
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {person.songCount}
                </td>
                {isAdmin && (
                  <td className="py-2">
                    <TextLink
                      href={`/people/${person.id}/edit`}
                      className="text-sm"
                    >
                      編集
                    </TextLink>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          該当する制作陣がいません
        </p>
      )}
    </div>
  );
}
