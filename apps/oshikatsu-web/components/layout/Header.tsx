"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
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
          <PendingLink href="/" feedback="global" className="flex items-center">
            <Image
              src="/Sakalog_header.png"
              alt="Sakalog"
              width={1306}
              height={734}
              priority
              className="h-8 w-auto"
            />
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

        {/* モバイル: ハンバーガーボタン（押下でドロワーを開く） */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
          aria-label="メニューを開く"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </div>

      {/* モバイルメニュー: 画面右からスライドインするドロワー（オーバーレイ）。
          Headless UI の Dialog が Esc / 背景タップ / フォーカストラップ / スクロールロックを担う。 */}
      <Dialog
        open={isMenuOpen}
        onClose={closeMenu}
        className="relative z-50 md:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <DialogPanel
          transition
          className="fixed inset-y-0 right-0 flex w-72 max-w-[80%] flex-col border-l border-foreground/10 bg-background shadow-xl transition duration-200 ease-out data-[closed]:translate-x-full"
        >
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
            <DialogTitle className="text-sm font-medium text-foreground/70">
              メニュー
            </DialogTitle>
            <button
              onClick={closeMenu}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="メニューを閉じる"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
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

          <div className="border-t border-foreground/10 px-4 py-3">
            <button
              onClick={handleLogout}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              ログアウト
            </button>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
