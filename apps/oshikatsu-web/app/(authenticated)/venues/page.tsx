import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createVenueRepository } from "@/repositories/venueRepository";
import { listVenues } from "@/usecases/listVenues";
import { Button } from "@/components/ui/Button";

export default async function VenuesPage() {
  const supabase = await createClient();
  const repo = createVenueRepository(supabase);
  const venues = await listVenues(repo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">会場</h1>
        <Link href="/venues/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">会場名</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">都道府県</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">キャパ</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((venue) => (
              <tr key={venue.id} className="border-b border-foreground/5">
                <td className="py-2 pr-4">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-foreground hover:underline"
                  >
                    {venue.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {venue.prefecture ?? "—"}
                </td>
                <td className="py-2 pr-4 text-foreground/70">
                  {venue.capacity != null
                    ? `${venue.capacity.toLocaleString()}人`
                    : "—"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/venues/${venue.id}/edit`}
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

      {venues.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          会場が登録されていません
        </p>
      )}
    </div>
  );
}
