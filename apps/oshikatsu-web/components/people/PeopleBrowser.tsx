"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Person, PersonRole } from "@/types/person";
import { PERSON_ROLE_LABELS, PERSON_ROLE_VALUES } from "@/types/person";

type PeopleBrowserProps = {
  people: Person[];
};

export function PeopleBrowser({ people }: PeopleBrowserProps) {
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
          {filtered.length}人
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">名前</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">生年月日</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">担当</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((person) => (
              <tr key={person.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{person.displayName}</td>
                <td className="py-2 pr-4 text-foreground/70">
                  {person.dateOfBirth ?? "—"}
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
                <td className="py-2">
                  <Link
                    href={`/people/${person.id}/edit`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          該当する制作陣がいません
        </p>
      )}
    </div>
  );
}
