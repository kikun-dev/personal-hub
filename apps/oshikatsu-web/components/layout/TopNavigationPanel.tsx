"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { APP_NAV_ITEMS, isNavigationItemActive } from "@/lib/navigation";

export function TopNavigationPanel() {
  const pathname = usePathname();

  return (
    <Card className="sticky top-6">
      <h2 className="text-sm font-medium text-foreground/70">ナビゲーション</h2>
      <nav className="mt-3 flex flex-col gap-2">
        {APP_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              isNavigationItemActive(pathname, item.href)
                ? "bg-foreground/10 font-medium text-foreground"
                : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </Card>
  );
}
