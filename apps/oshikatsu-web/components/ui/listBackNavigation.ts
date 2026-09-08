const LIST_BACK_NAVIGATION_KEY = "oshikatsu-web:list-back-navigation";
const LIST_BACK_NAVIGATION_MAX_AGE_MS = 30 * 60 * 1000;

type ListBackNavigationState = {
  createdAt: number;
  fallbackPathname: string;
  targetPath: string;
};

type RegisterListBackNavigationOptions = {
  fallbackHref: string;
  targetHref: string;
};

type ListBackNavigationMatchOptions = {
  currentHref: string;
  fallbackHref: string;
};

function toPath(url: URL): string {
  return `${url.pathname}${url.search}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseListBackNavigationState(
  rawValue: string | null
): ListBackNavigationState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(rawValue);

    if (
      !isRecord(value) ||
      typeof value.createdAt !== "number" ||
      typeof value.fallbackPathname !== "string" ||
      typeof value.targetPath !== "string"
    ) {
      return null;
    }

    return {
      createdAt: value.createdAt,
      fallbackPathname: value.fallbackPathname,
      targetPath: value.targetPath,
    };
  } catch {
    return null;
  }
}

function readSessionValue(): string | null {
  try {
    return window.sessionStorage.getItem(LIST_BACK_NAVIGATION_KEY);
  } catch {
    return null;
  }
}

function removeSessionValue(): void {
  try {
    window.sessionStorage.removeItem(LIST_BACK_NAVIGATION_KEY);
  } catch {
    return;
  }
}

function matchesListBackNavigation(
  state: ListBackNavigationState | null,
  { currentHref, fallbackHref }: ListBackNavigationMatchOptions
): boolean {
  if (!state) {
    return false;
  }

  const currentUrl = new URL(currentHref);
  const fallbackUrl = new URL(fallbackHref, currentUrl);
  const isExpired =
    Date.now() - state.createdAt > LIST_BACK_NAVIGATION_MAX_AGE_MS;

  return (
    !isExpired &&
    state.targetPath === toPath(currentUrl) &&
    state.fallbackPathname === fallbackUrl.pathname
  );
}

export function registerListBackNavigation({
  fallbackHref,
  targetHref,
}: RegisterListBackNavigationOptions): void {
  const currentUrl = new URL(window.location.href);
  const targetUrl = new URL(targetHref, currentUrl);
  const fallbackUrl = new URL(fallbackHref, currentUrl);

  if (
    targetUrl.origin !== currentUrl.origin ||
    fallbackUrl.origin !== currentUrl.origin
  ) {
    return;
  }

  const state: ListBackNavigationState = {
    createdAt: Date.now(),
    fallbackPathname: fallbackUrl.pathname,
    targetPath: toPath(targetUrl),
  };

  try {
    window.sessionStorage.setItem(
      LIST_BACK_NAVIGATION_KEY,
      JSON.stringify(state)
    );
  } catch {
    return;
  }
}

export function consumeListBackNavigation({
  currentHref,
  fallbackHref,
}: ListBackNavigationMatchOptions): boolean {
  const state = parseListBackNavigationState(readSessionValue());
  removeSessionValue();

  return matchesListBackNavigation(state, { currentHref, fallbackHref });
}

/** detail の表示中は marker を消費せず、最終的な一覧復帰時まで保持する。 */
export function hasListBackNavigation({
  currentHref,
  fallbackHref,
}: ListBackNavigationMatchOptions): boolean {
  const state = parseListBackNavigationState(readSessionValue());
  return matchesListBackNavigation(state, { currentHref, fallbackHref });
}
