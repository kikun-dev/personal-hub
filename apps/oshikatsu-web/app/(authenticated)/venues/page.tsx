import Link from "next/link";
import { getVenuesPageData } from "@/usecases/readOrbitData";
import { VenueTable } from "@/components/venues/VenueTable";
import { Button } from "@/components/ui/Button";

export default async function VenuesPage() {
  const venues = await getVenuesPageData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">会場</h1>
        <Link href="/venues/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      {venues.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          会場が登録されていません
        </p>
      ) : (
        <VenueTable venues={venues} />
      )}
    </div>
  );
}
