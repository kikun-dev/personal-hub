import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { listPeople } from "@/usecases/listPeople";
import { Button } from "@/components/ui/Button";
import { PeopleBrowser } from "@/components/people/PeopleBrowser";

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

      <PeopleBrowser people={people} />
    </div>
  );
}
