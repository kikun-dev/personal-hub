import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MonthSelector } from "@/components/events/MonthSelector";
import { parseMonthParams } from "@/lib/dateParams";
import { formatDate } from "@/lib/formatters";

type AdminEventsPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function AdminEventsPage({
  searchParams,
}: AdminEventsPageProps) {
  const params = await searchParams;
  const { year, month } = parseMonthParams(params);

  const supabase = await createClient();
  const repo = createEventRepository(supabase);
  const events = await repo.findByMonth(year, month);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">イベント管理</h1>
        <Link href="/admin/events/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="flex justify-center">
        <Suspense fallback={<div className="h-10" />}>
          <MonthSelector
            year={year}
            month={month}
            basePath="/admin/events"
          />
        </Suspense>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">日付</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">種別</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">タイトル</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.id}
                className="border-b border-foreground/5"
              >
                <td className="py-2 pr-4 text-foreground/70">
                  {formatDate(event.date)}
                </td>
                <td className="py-2 pr-4">
                  <Badge
                    label={event.eventTypeName}
                    color={event.eventTypeColor}
                  />
                </td>
                <td className="py-2 pr-4 text-foreground">
                  {event.title}
                  <span className="ml-1 text-xs text-foreground/40">
                    {event.groupNames.join(", ")}
                  </span>
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/events/${event.id}/edit`}
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

      {events.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          この月のイベントはありません
        </p>
      )}
    </div>
  );
}
