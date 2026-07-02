"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@personal-hub/supabase/client";
import { PendingLink } from "@/components/ui/PendingLink";
import {
  HEADER_NAV_ITEMS,
  TOP_NAV_ITEMS,
  filterNavItemsForRole,
  isNavigationItemActive,
} from "@/lib/navigation";

type HeaderProps = {
  isAdmin: boolean;
};

export function Header({ isAdmin }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const headerNavItems = filterNavItemsForRole(HEADER_NAV_ITEMS, isAdmin);
  const mobileNavItems = filterNavItemsForRole(TOP_NAV_ITEMS, isAdmin);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-foreground/10 bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <PendingLink
            href="/"
            feedback="global"
            className="text-lg font-bold text-foreground"
          >
            Orbit
          </PendingLink>
          {/* デスクトップナビ */}
          <nav className="hidden gap-4 md:flex">
            {headerNavItems.map((item) => (
              <PendingLink
                key={item.href}
                href={item.href}
                feedback="global"
                className={`text-sm transition-colors ${
                  isNavigationItemActive(pathname, item.href)
                    ? "font-medium text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </PendingLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            onClick={handleLogout}
            className="text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            ログアウト
          </button>
        </div>

        {/* モバイル: ハンバーガーボタン */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
          aria-label="メニュー"
        >
          {isMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </button>
      </div>

      {/* モバイルメニュー */}
      {isMenuOpen && (
        <div className="border-t border-foreground/10 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2">
            {mobileNavItems.map((item) => (
              <PendingLink
                key={item.href}
                href={item.href}
                feedback="global"
                onClick={closeMenu}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  isNavigationItemActive(pathname, item.href)
                    ? "bg-foreground/5 font-medium text-foreground"
                    : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </PendingLink>
            ))}
          </nav>
          <div className="mt-3 border-t border-foreground/10 pt-3">
            <button
              onClick={handleLogout}
              className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
