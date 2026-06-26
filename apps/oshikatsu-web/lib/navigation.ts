import { APP_ROUTES } from "@/lib/routes";

export type AppNavigationItem = {
  href: string;
  label: string;
};

const ADMIN_NAV_ITEM: AppNavigationItem = {
  href: APP_ROUTES.admin,
  label: "管理",
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
  ADMIN_NAV_ITEM,
];

export const TOP_NAV_ITEMS: AppNavigationItem[] = [
  ...CONTENT_NAV_ITEMS,
  { href: APP_ROUTES.people, label: "制作陣" },
  { href: APP_ROUTES.venues, label: "会場" },
  ADMIN_NAV_ITEM,
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}
