export type AppNavigationItem = {
  href: string;
  label: string;
};

export const HEADER_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/members", label: "メンバー" },
  { href: "/songs", label: "楽曲" },
  { href: "/releases", label: "リリース" },
  { href: "/admin", label: "管理" },
];

export const TOP_NAV_ITEMS: AppNavigationItem[] = [
  ...HEADER_NAV_ITEMS,
  { href: "/people", label: "制作陣" },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}
