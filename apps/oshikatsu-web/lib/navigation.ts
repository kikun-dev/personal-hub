export type AppNavigationItem = {
  href: string;
  label: string;
};

export const APP_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/members", label: "メンバー" },
  { href: "/songs", label: "楽曲" },
  { href: "/releases", label: "リリース" },
  { href: "/admin", label: "管理" },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}
