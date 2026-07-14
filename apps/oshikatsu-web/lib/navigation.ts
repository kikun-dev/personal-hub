import { APP_ROUTES } from "@/lib/routes";

export type AppNavigationItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

// Mobile ドロワー用の IA グループ（見出し + 配下 item）。
export type AppNavigationSection = {
  label: string;
  items: AppNavigationItem[];
};

// 主要閲覧: メンバー / 楽曲 / リリース / ライブ。Header ではフラットに並べる。
export const PRIMARY_NAV_ITEMS: AppNavigationItem[] = [
  { href: APP_ROUTES.members, label: "メンバー" },
  { href: APP_ROUTES.songs, label: "楽曲" },
  { href: APP_ROUTES.releases, label: "リリース" },
  { href: APP_ROUTES.lives, label: "ライブ" },
];

// アーカイブ: 制作陣 / 会場 / 聖地マップ / Wiki。Header では「アーカイブ」dropdown に格納する。
export const ARCHIVE_NAV_ITEMS: AppNavigationItem[] = [
  { href: APP_ROUTES.people, label: "制作陣" },
  { href: APP_ROUTES.venues, label: "会場" },
  { href: APP_ROUTES.spots, label: "聖地マップ" },
  { href: APP_ROUTES.wiki, label: "Wiki" },
];

// アカウント: マイページ（ADR 0009: ユーザー別データで admin / viewer 共通のため adminOnly なし） / 管理。
export const ACCOUNT_NAV_ITEMS: AppNavigationItem[] = [
  { href: APP_ROUTES.mypage, label: "マイページ" },
  { href: APP_ROUTES.admin, label: "管理", adminOnly: true },
];

// Mobile ドロワー用のセクション配列（主要閲覧 → アーカイブ → アカウントの順）。
export const NAV_SECTIONS: AppNavigationSection[] = [
  { label: "主要閲覧", items: PRIMARY_NAV_ITEMS },
  { label: "アーカイブ", items: ARCHIVE_NAV_ITEMS },
  { label: "アカウント", items: ACCOUNT_NAV_ITEMS },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

// コスメティックな出し分け専用（防御は middleware / requireAdmin / RLS が担う）。
export function filterNavItemsForRole(
  items: AppNavigationItem[],
  isAdmin: boolean
): AppNavigationItem[] {
  return isAdmin ? items : items.filter((item) => !item.adminOnly);
}
