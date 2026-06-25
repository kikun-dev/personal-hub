import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createVenueRepository } from "@/repositories/venueRepository";
import { getVenue } from "@/usecases/getVenue";
import { Button } from "@/components/ui/Button";

type VenueDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const venue = await getVenue(createVenueRepository(supabase), id);

  if (!venue) {
    notFound();
  }

  const rows: { label: string; value: string | null }[] = [
    { label: "都道府県", value: venue.prefecture },
    { label: "住所", value: venue.address },
    {
      label: "キャパシティ",
      value: venue.capacity != null ? `${venue.capacity.toLocaleString()}人` : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">{venue.name}</h1>
        <Link href={`/venues/${venue.id}/edit`}>
          <Button variant="secondary">編集</Button>
        </Link>
      </div>

      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 text-sm">
            <dt className="w-24 shrink-0 text-foreground/50">{row.label}</dt>
            <dd className="text-foreground">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      {venue.access && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">交通情報</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {venue.access}
          </p>
        </section>
      )}

      {venue.notes && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">メモ</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {venue.notes}
          </p>
        </section>
      )}
    </div>
  );
}
