"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { createClient } from "@personal-hub/supabase/client";
import { PendingLink } from "@/components/ui/PendingLink";
import {
  ACCOUNT_NAV_ITEMS,
  ARCHIVE_NAV_ITEMS,
  NAV_SECTIONS,
  PRIMARY_NAV_ITEMS,
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

  const accountNavItems = filterNavItemsForRole(ACCOUNT_NAV_ITEMS, isAdmin);
  const isArchiveActive = ARCHIVE_NAV_ITEMS.some((item) =>
    isNavigationItemActive(pathname, item.href)
  );

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-border-subtle bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <PendingLink
            href="/"
            feedback="global"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex items-center rounded-md"
          >
            {/* 横型ロゴをライト/ダークで出し分け（dark: は prefers-color-scheme 準拠、ダーク版は透過PNG） */}
            <Image
              src="/Sakalog_header.png"
              alt="Sakalog"
              width={2172}
              height={724}
              priority
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/Sakalog_header_dark.png"
              alt="Sakalog"
              width={2172}
              height={724}
              className="hidden h-8 w-auto dark:block"
            />
          </PendingLink>
          {/* デスクトップナビ: 主要閲覧 → アーカイブ(dropdown) → アカウント */}
          <nav className="hidden items-center gap-4 md:flex">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = isNavigationItemActive(pathname, item.href);
              return (
                <PendingLink
                  key={item.href}
                  href={item.href}
                  feedback="global"
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-2 py-1 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-selected font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-surface-subtle hover:text-foreground"
                  }`}
                >
                  {item.label}
                </PendingLink>
              );
            })}

            {/* アーカイブ: 制作陣 / 会場 / 聖地マップ / Wiki をまとめた dropdown */}
            <Menu as="div" className="relative">
              <MenuButton
                className={`group inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring data-[open]:text-foreground ${
                  isArchiveActive
                    ? "bg-surface-selected font-medium text-foreground"
                    : "text-foreground-secondary hover:bg-surface-subtle hover:text-foreground"
                }`}
              >
                アーカイブ
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  className="transition-transform duration-150 group-data-[open]:rotate-180 motion-reduce:transition-none"
                >
                  <path d="M3 4.5l3 3 3-3" />
                </svg>
              </MenuButton>
              {/* 前面の操作面は境界か影の一方だけで定義する（DESIGN.md The One Edge Rule）。
                  ダークでは影が視認できないため、light=影のみ / dark=境界のみで面を分離する。 */}
              <MenuItems
                anchor={{ to: "bottom start", gap: 4 }}
                className="z-50 min-w-36 rounded-lg bg-background py-1 shadow-lg focus:outline-none dark:border dark:border-border-subtle dark:shadow-none"
              >
                {ARCHIVE_NAV_ITEMS.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);
                  return (
                    <MenuItem key={item.href} as={Fragment}>
                      <PendingLink
                        href={item.href}
                        feedback="global"
                        aria-current={isActive ? "page" : undefined}
                        className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors data-[focus]:bg-surface-subtle ${
                          isActive
                            ? "bg-surface-selected font-medium text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </PendingLink>
                    </MenuItem>
                  );
                })}
              </MenuItems>
            </Menu>

            {accountNavItems.map((item) => {
              const isActive = isNavigationItemActive(pathname, item.href);
              return (
                <PendingLink
                  key={item.href}
                  href={item.href}
                  feedback="global"
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-2 py-1 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-selected font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-surface-subtle hover:text-foreground"
                  }`}
                >
                  {item.label}
                </PendingLink>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            onClick={handleLogout}
            className="rounded-md text-sm text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            ログアウト
          </button>
        </div>

        {/* モバイル: ハンバーガーボタン（押下でドロワーを開く）。
            44pxのhit areaを確保しつつ、負marginでheaderの視覚高さを現状維持する。 */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="-my-1.5 flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring md:hidden"
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
          className="fixed inset-y-0 right-0 flex w-72 max-w-[80%] flex-col border-l border-border-subtle bg-background shadow-xl transition duration-200 ease-out data-[closed]:translate-x-full"
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <DialogTitle className="text-sm font-medium text-foreground-secondary">
              メニュー
            </DialogTitle>
            <button
              onClick={closeMenu}
              className="-m-1.5 flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              aria-label="メニューを閉じる"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
            {NAV_SECTIONS.map((section, index) => (
              <Fragment key={section.label}>
                <p
                  className={`px-3 pb-1 text-xs font-medium text-foreground-secondary ${
                    index === 0 ? "pt-1" : "pt-4"
                  }`}
                >
                  {section.label}
                </p>
                {filterNavItemsForRole(section.items, isAdmin).map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);
                  return (
                    <PendingLink
                      key={item.href}
                      href={item.href}
                      feedback="global"
                      onClick={closeMenu}
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-surface-selected font-medium text-foreground"
                          : "text-foreground-secondary hover:bg-surface-subtle hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </PendingLink>
                  );
                })}
              </Fragment>
            ))}
          </nav>

          <div className="border-t border-border-subtle px-4 py-3">
            <button
              onClick={handleLogout}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              ログアウト
            </button>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
