import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueDetailPageData } from "@/usecases/readOrbitData";
import { Button } from "@/components/ui/Button";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";

type VenueDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = await params;
  const data = await getVenueDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!data) {
    notFound();
  }

  const { venue, performances } = data;

  const rows: { label: string; value: string | null }[] = [
    { label: "都道府県", value: venue.prefecture },
    {
      label: "キャパシティ",
      value: venue.capacity != null ? `${venue.capacity.toLocaleString()}人` : null,
    },
  ];

  const links: { label: string; url: string | null }[] = [
    { label: "Googleマップ", url: venue.mapUrl },
    { label: "公式サイト", url: venue.officialUrl },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">{venue.name}</h1>
        {isAdmin && (
          <Link href={`/venues/${venue.id}/edit`}>
            <Button variant="secondary">編集</Button>
          </Link>
        )}
      </div>

      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 text-sm">
            <dt className="w-24 shrink-0 text-foreground/50">{row.label}</dt>
            <dd className="text-foreground">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      {links.some((link) => link.url) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {links
            .filter((link) => link.url)
            .map((link) => (
              <a
                key={link.label}
                href={link.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {link.label}
              </a>
            ))}
        </div>
      )}

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

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">この会場の公演</h2>
        {performances.length === 0 ? (
          <p className="text-sm text-foreground/50">公演の登録はありません</p>
        ) : (
          <ul className="space-y-1">
            {performances.map((performance) => (
              <li key={performance.performanceId} className="text-sm">
                <Link
                  href={`/lives/${performance.liveId}`}
                  className="text-foreground hover:underline"
                >
                  {performance.performanceDate ?? "日付未定"}
                  {" "}
                  {performance.liveName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
