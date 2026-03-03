"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type HeaderProps = {
  userEmail: string;
};

export function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "ダッシュボード" },
    { href: "/transactions/new", label: "新規入力" },
  ];

  return (
    <header className="border-b border-foreground/10 bg-background">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-foreground">
            Ledger
          </Link>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname === item.href
                    ? "font-medium text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground/50">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
