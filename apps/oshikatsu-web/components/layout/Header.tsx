"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@personal-hub/supabase/client";

type HeaderProps = {
  userEmail: string;
};

export function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "トップ" },
    { href: "/members", label: "メンバー" },
    { href: "/songs", label: "楽曲" },
    { href: "/releases", label: "リリース" },
    { href: "/admin", label: "管理" },
  ];

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(href));

  return (
    <header className="border-b border-foreground/10 bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-foreground">
            Orbit
          </Link>
          {/* デスクトップナビ */}
          <nav className="hidden gap-4 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  isActive(item.href)
                    ? "font-medium text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* デスクトップ: メール + ログアウト */}
        <div className="hidden items-center gap-4 md:flex">
          <span className="text-xs text-foreground/50">{userEmail}</span>
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-foreground/5 font-medium text-foreground"
                    : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-foreground/10 pt-3">
            <p className="px-3 text-xs text-foreground/50">{userEmail}</p>
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
