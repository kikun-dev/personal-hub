import { APP_ROUTES } from "@/lib/routes";

export type AppNavigationItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const ADMIN_NAV_ITEM: AppNavigationItem = {
  href: APP_ROUTES.admin,
  label: "管理",
  adminOnly: true,
};

// マイページはユーザー別データ（ADR 0009）で admin / viewer 共通のため adminOnly なし。
// 閲覧系ナビの最後・管理の直前に置く。
const MYPAGE_NAV_ITEM: AppNavigationItem = {
  href: APP_ROUTES.mypage,
  label: "マイページ",
};

// 管理を除いた閲覧系ナビ（管理は常に末尾に置く）
const CONTENT_NAV_ITEMS: AppNavigationItem[] = [
  { href: APP_ROUTES.members, label: "メンバー" },
  { href: APP_ROUTES.songs, label: "楽曲" },
  { href: APP_ROUTES.releases, label: "リリース" },
  { href: APP_ROUTES.lives, label: "ライブ" },
];

export const HEADER_NAV_ITEMS: AppNavigationItem[] = [
  ...CONTENT_NAV_ITEMS,
  MYPAGE_NAV_ITEM,
  ADMIN_NAV_ITEM,
];

export const TOP_NAV_ITEMS: AppNavigationItem[] = [
  ...CONTENT_NAV_ITEMS,
  { href: APP_ROUTES.people, label: "制作陣" },
  { href: APP_ROUTES.venues, label: "会場" },
  { href: APP_ROUTES.spots, label: "聖地マップ" },
  MYPAGE_NAV_ITEM,
  ADMIN_NAV_ITEM,
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
