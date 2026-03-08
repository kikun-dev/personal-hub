import Link from "next/link";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    href: "/admin/members",
    title: "メンバー管理",
    description: "メンバーの追加・編集・削除を行います",
  },
  {
    href: "/admin/events",
    title: "イベント管理",
    description: "イベントの追加・編集・削除を行います",
  },
  {
    href: "/admin/songs",
    title: "楽曲管理",
    description: "楽曲の追加・編集・削除を行います",
  },
  {
    href: "/admin/releases",
    title: "リリース管理",
    description: "リリース作品の追加・編集・削除を行います",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">管理</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:bg-foreground/5">
              <h2 className="font-medium text-foreground">{section.title}</h2>
              <p className="mt-1 text-sm text-foreground/60">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
