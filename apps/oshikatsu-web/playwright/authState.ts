import { readFileSync } from "node:fs";

// Playwright の storageState（playwright/.auth/user.json）に保存された Supabase セッションから
// access token の失効時刻を取り出す。config が suite 開始前に fail-fast するための判定材料であり、
// 「読めなかった理由」を呼び出し側がメッセージへ落とせるよう判別可能なUnionで返す。
//
// 保存形式（実データで確認）:
//   - セッションは cookie 側にある（storageState の origins は空）
//   - cookie 名は `sb-<project-ref>-auth-token`。値が長いと `.0` / `.1` … へ chunk 分割される
//   - `base64-` prefix は連結後の先頭にだけ付き、本体は base64url
//   - デコード結果は JSON で、`expires_at` は epoch 秒
export type StoredSessionExpiry =
  | { kind: "ok"; expiresAtMs: number }
  | { kind: "file-missing"; path: string }
  | { kind: "file-unreadable"; path: string; detail: string }
  | { kind: "storage-state-invalid"; detail: string }
  | { kind: "auth-cookie-missing" }
  | { kind: "auth-cookie-chunks-incomplete"; missingIndex: number }
  | { kind: "session-not-base64"; detail: string }
  | { kind: "session-not-json"; detail: string }
  | { kind: "expires-at-missing" }
  | { kind: "expires-at-not-numeric"; value: unknown };

type AuthCookieChunk = { index: number; value: string };

// 非分割（`sb-<ref>-auth-token`）と分割（`sb-<ref>-auth-token.0`）の両方を拾う。
// project ref は環境で変わるためハードコードしない。
const AUTH_COOKIE_NAME = /^sb-.+-auth-token(?:\.(\d+))?$/;
const BASE64_PREFIX = "base64-";
const BASE64URL_BODY = /^[A-Za-z0-9_-]*={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectAuthCookieChunks(
  storageState: Record<string, unknown>
): AuthCookieChunk[] | { detail: string } {
  const cookies = storageState.cookies;
  if (!Array.isArray(cookies)) {
    return { detail: "cookies配列がありません" };
  }

  const chunks: AuthCookieChunk[] = [];
  for (const cookie of cookies) {
    if (!isRecord(cookie)) {
      return { detail: "cookie要素がobjectではありません" };
    }
    const { name, value } = cookie;
    if (typeof name !== "string" || typeof value !== "string") {
      return { detail: "cookieのname / valueがstringではありません" };
    }

    const matched = AUTH_COOKIE_NAME.exec(name);
    if (matched === null) {
      continue;
    }
    // 非分割の cookie は単独で完結するため index 0 として扱う。
    chunks.push({ index: matched[1] === undefined ? 0 : Number(matched[1]), value });
  }

  return chunks;
}

// chunk は保存順に並ぶとは限らず、10個を超えると文字列順（"10" < "2"）が破綻するため
// index の数値順で連結する。
function joinAuthCookieChunks(
  chunks: AuthCookieChunk[]
): { kind: "ok"; raw: string } | { kind: "incomplete"; missingIndex: number } {
  const ordered = [...chunks].sort((a, b) => a.index - b.index);

  for (const [position, chunk] of ordered.entries()) {
    if (chunk.index !== position) {
      return { kind: "incomplete", missingIndex: position };
    }
  }

  return { kind: "ok", raw: ordered.map((chunk) => chunk.value).join("") };
}

function readAuthFile(
  authFilePath: string
): { kind: "ok"; contents: string } | { kind: "missing" } | { kind: "unreadable"; detail: string } {
  try {
    return { kind: "ok", contents: readFileSync(authFilePath, "utf8") };
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      return { kind: "missing" };
    }
    return { kind: "unreadable", detail: error instanceof Error ? error.message : String(error) };
  }
}

export function readStoredSessionExpiry(authFilePath: string): StoredSessionExpiry {
  const file = readAuthFile(authFilePath);
  if (file.kind === "missing") {
    return { kind: "file-missing", path: authFilePath };
  }
  if (file.kind === "unreadable") {
    return { kind: "file-unreadable", path: authFilePath, detail: file.detail };
  }

  let storageState: unknown;
  try {
    storageState = JSON.parse(file.contents);
  } catch (error) {
    return {
      kind: "storage-state-invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!isRecord(storageState)) {
    return { kind: "storage-state-invalid", detail: "storageStateがobjectではありません" };
  }

  const chunks = collectAuthCookieChunks(storageState);
  if (!Array.isArray(chunks)) {
    return { kind: "storage-state-invalid", detail: chunks.detail };
  }
  if (chunks.length === 0) {
    return { kind: "auth-cookie-missing" };
  }

  const joined = joinAuthCookieChunks(chunks);
  if (joined.kind === "incomplete") {
    return { kind: "auth-cookie-chunks-incomplete", missingIndex: joined.missingIndex };
  }

  if (!joined.raw.startsWith(BASE64_PREFIX)) {
    return { kind: "session-not-base64", detail: `"${BASE64_PREFIX}" で始まっていません` };
  }
  const body = joined.raw.slice(BASE64_PREFIX.length);
  // Buffer.from(..., "base64url") は不正な文字を黙って捨てるため、先に字種を検証する。
  // ここを通さないと壊れたcookieが「JSONが不正」として誤って報告される。
  if (!BASE64URL_BODY.test(body)) {
    return { kind: "session-not-base64", detail: "base64urlに使えない文字が含まれています" };
  }

  const decoded = Buffer.from(body, "base64url").toString("utf8");
  let session: unknown;
  try {
    session = JSON.parse(decoded);
  } catch (error) {
    return {
      kind: "session-not-json",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!isRecord(session)) {
    return { kind: "session-not-json", detail: "sessionがobjectではありません" };
  }

  const expiresAt = session.expires_at;
  if (expiresAt === undefined) {
    return { kind: "expires-at-missing" };
  }
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return { kind: "expires-at-not-numeric", value: expiresAt };
  }

  return { kind: "ok", expiresAtMs: expiresAt * 1000 };
}

// 失効理由を、config の fail-fast メッセージへそのまま載せられる日本語へ落とす。
export function describeExpiryFailure(
  result: Exclude<StoredSessionExpiry, { kind: "ok" }>
): string {
  switch (result.kind) {
    case "file-missing":
      return `認証状態ファイルがありません（${result.path}）。`;
    case "file-unreadable":
      return `認証状態ファイルを読めません（${result.path}）: ${result.detail}`;
    case "storage-state-invalid":
      return `認証状態ファイルの形式が不正です: ${result.detail}`;
    case "auth-cookie-missing":
      return "認証状態にSupabaseのauth cookieが含まれていません。";
    case "auth-cookie-chunks-incomplete":
      return `Supabase auth cookieのchunkが欠落しています（index ${result.missingIndex} が見つかりません）。`;
    case "session-not-base64":
      return `Supabase auth cookieをbase64urlとして解釈できません: ${result.detail}`;
    case "session-not-json":
      return `Supabase auth cookieのデコード結果がJSONとして不正です: ${result.detail}`;
    case "expires-at-missing":
      return "Supabaseセッションにexpires_atがありません。";
    case "expires-at-not-numeric":
      return `Supabaseセッションのexpires_atが数値ではありません（${String(result.value)}）。`;
  }
}
