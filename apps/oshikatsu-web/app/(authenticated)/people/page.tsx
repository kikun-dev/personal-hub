import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { listPeople } from "@/usecases/listPeople";
import { PERSON_ROLE_LABELS } from "@/types/person";
import { Button } from "@/components/ui/Button";

export default async function PeoplePage() {
  const supabase = await createClient();
  const repo = createPersonRepository(supabase);
  const people = await listPeople(repo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">制作陣マスタ</h1>
        <Link href="/people/new">
          <Button>新規追加</Button>
        </Link>
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
            {people.map((person) => (
              <tr key={person.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4 text-foreground">{person.displayName}</td>
                <td className="py-2 pr-4 text-foreground/70">{person.dateOfBirth ?? "—"}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {person.roles.length > 0
                      ? person.roles.map((role) => (
                        <span
                          key={`${person.id}-${role}`}
                          className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground"
                        >
                          {PERSON_ROLE_LABELS[role]}
                        </span>
                      ))
                      : <span className="text-foreground/40">—</span>}
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

      {people.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          制作陣が登録されていません
        </p>
      )}
    </div>
  );
}
