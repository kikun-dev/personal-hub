import { APP_ROUTES } from "@/lib/routes";

export type AppNavigationItem = {
  href: string;
  label: string;
};

export const HEADER_NAV_ITEMS: AppNavigationItem[] = [
  { href: APP_ROUTES.members, label: "メンバー" },
  { href: APP_ROUTES.songs, label: "楽曲" },
  { href: APP_ROUTES.releases, label: "リリース" },
  { href: APP_ROUTES.admin, label: "管理" },
];

export const TOP_NAV_ITEMS: AppNavigationItem[] = [
  ...HEADER_NAV_ITEMS,
  { href: APP_ROUTES.people, label: "制作陣" },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}
