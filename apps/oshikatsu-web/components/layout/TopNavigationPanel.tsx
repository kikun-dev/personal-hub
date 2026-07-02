"use client";

import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PendingLink } from "@/components/ui/PendingLink";
import {
  TOP_NAV_ITEMS,
  filterNavItemsForRole,
  isNavigationItemActive,
} from "@/lib/navigation";

type TopNavigationPanelProps = {
  isAdmin: boolean;
};

export function TopNavigationPanel({ isAdmin }: TopNavigationPanelProps) {
  const pathname = usePathname();
  const navItems = filterNavItemsForRole(TOP_NAV_ITEMS, isAdmin);

  return (
    <Card className="sticky top-6">
      <h2 className="text-sm font-medium text-foreground/70">ナビゲーション</h2>
      <nav className="mt-3 flex flex-col gap-2">
        {navItems.map((item) => (
          <PendingLink
            key={item.href}
            href={item.href}
            feedback="global"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              isNavigationItemActive(pathname, item.href)
                ? "bg-foreground/10 font-medium text-foreground"
                : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {item.label}
          </PendingLink>
        ))}
      </nav>
    </Card>
  );
}
