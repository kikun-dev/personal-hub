import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStoredSessionExpiry } from "./authState";

const EXPIRES_AT_SECONDS = 1784684678;

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "sakalog-auth-state-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

type Cookie = { name: string; value: string };

function writeStorageState(contents: string): string {
  const path = join(workDir, "user.json");
  writeFileSync(path, contents, "utf8");
  return path;
}

function writeCookies(cookies: Cookie[]): string {
  return writeStorageState(JSON.stringify({ cookies, origins: [] }));
}

function encodeSession(session: unknown): string {
  return `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
}

/** 連結後の文字列を chunkCount 個へ均等分割し、`sb-<ref>-auth-token.N` の形にする。 */
function splitIntoChunks(raw: string, chunkCount: number): Cookie[] {
  const size = Math.ceil(raw.length / chunkCount);
  return Array.from({ length: chunkCount }, (_, index) => ({
    name: `sb-testref-auth-token.${index}`,
    value: raw.slice(index * size, (index + 1) * size),
  }));
}

describe("readStoredSessionExpiry", () => {
  it("非分割の単一cookieからexpires_atをミリ秒で取得する", () => {
    const path = writeCookies([
      { name: "OTZ", value: "無関係なcookie" },
      {
        name: "sb-testref-auth-token",
        value: encodeSession({ expires_at: EXPIRES_AT_SECONDS }),
      },
    ]);

    expect(readStoredSessionExpiry(path)).toEqual({
      kind: "ok",
      expiresAtMs: EXPIRES_AT_SECONDS * 1000,
    });
  });

  it("複数chunkが順不同で保存されていても復元できる", () => {
    const chunks = splitIntoChunks(encodeSession({ expires_at: EXPIRES_AT_SECONDS }), 3);
    const path = writeCookies([chunks[2], chunks[0], chunks[1]]);

    expect(readStoredSessionExpiry(path)).toEqual({
      kind: "ok",
      expiresAtMs: EXPIRES_AT_SECONDS * 1000,
    });
  });

  it("chunkが10個を超えても文字列順ではなく数値順に連結する", () => {
    // 文字列順だと "10" が "2" より前に来て連結が壊れるため、.10 を含む構成で検証する。
    const chunks = splitIntoChunks(encodeSession({ expires_at: EXPIRES_AT_SECONDS }), 11);
    expect(chunks.map((chunk) => chunk.name)).toContain("sb-testref-auth-token.10");

    const path = writeCookies([...chunks].reverse());

    expect(readStoredSessionExpiry(path)).toEqual({
      kind: "ok",
      expiresAtMs: EXPIRES_AT_SECONDS * 1000,
    });
  });

  it("chunkが欠落している場合は欠落indexつきで形式不正にする", () => {
    const chunks = splitIntoChunks(encodeSession({ expires_at: EXPIRES_AT_SECONDS }), 3);
    const path = writeCookies([chunks[0], chunks[2]]);

    expect(readStoredSessionExpiry(path)).toEqual({
      kind: "auth-cookie-chunks-incomplete",
      missingIndex: 1,
    });
  });

  it("ファイルが存在しない場合はfile-missingを返す", () => {
    const path = join(workDir, "does-not-exist.json");

    expect(readStoredSessionExpiry(path)).toEqual({ kind: "file-missing", path });
  });

  it("storageStateがJSONとして壊れている場合はstorage-state-invalidを返す", () => {
    const path = writeStorageState("{ これはJSONではない");

    expect(readStoredSessionExpiry(path)).toMatchObject({ kind: "storage-state-invalid" });
  });

  it("storageStateのcookiesが配列でない場合はstorage-state-invalidを返す", () => {
    const path = writeStorageState(JSON.stringify({ cookies: "配列ではない" }));

    expect(readStoredSessionExpiry(path)).toMatchObject({ kind: "storage-state-invalid" });
  });

  it("auth cookieが1つも無い場合はauth-cookie-missingを返す", () => {
    const path = writeCookies([{ name: "OTZ", value: "無関係なcookie" }]);

    expect(readStoredSessionExpiry(path)).toEqual({ kind: "auth-cookie-missing" });
  });

  it("base64urlに使えない文字が含まれる場合はsession-not-base64を返す", () => {
    const path = writeCookies([
      { name: "sb-testref-auth-token", value: "base64-これは!!base64urlではない" },
    ]);

    expect(readStoredSessionExpiry(path)).toMatchObject({ kind: "session-not-base64" });
  });

  it("base64-prefixが無い場合もsession-not-base64を返す", () => {
    const path = writeCookies([
      {
        name: "sb-testref-auth-token",
        value: Buffer.from(JSON.stringify({ expires_at: EXPIRES_AT_SECONDS })).toString(
          "base64url"
        ),
      },
    ]);

    expect(readStoredSessionExpiry(path)).toMatchObject({ kind: "session-not-base64" });
  });

  it("デコード結果がJSONでない場合はsession-not-jsonを返す", () => {
    const path = writeCookies([
      {
        name: "sb-testref-auth-token",
        value: `base64-${Buffer.from("JSONではない文字列", "utf8").toString("base64url")}`,
      },
    ]);

    expect(readStoredSessionExpiry(path)).toMatchObject({ kind: "session-not-json" });
  });

  it("expires_atが無い場合はexpires-at-missingを返す", () => {
    const path = writeCookies([
      { name: "sb-testref-auth-token", value: encodeSession({ access_token: "dummy" }) },
    ]);

    expect(readStoredSessionExpiry(path)).toEqual({ kind: "expires-at-missing" });
  });

  it("expires_atが数値でない場合はexpires-at-invalidを返す", () => {
    const path = writeCookies([
      {
        name: "sb-testref-auth-token",
        value: encodeSession({ expires_at: String(EXPIRES_AT_SECONDS) }),
      },
    ]);

    expect(readStoredSessionExpiry(path)).toEqual({
      kind: "expires-at-invalid",
      value: String(EXPIRES_AT_SECONDS),
    });
  });

  // 有限でも巨大な値はミリ秒換算でInfinityになり、残り時間の比較を素通りしてfail-openになる。
  it.each([
    ["safe integerを超える巨大な有限値", 1e308],
    ["秒はsafe integerだがミリ秒換算で精度を失う値", 9_000_000_000_000_000],
    ["負の値", -1],
    ["0", 0],
    ["小数", EXPIRES_AT_SECONDS + 0.5],
  ])("expires_atが%sの場合はexpires-at-invalidを返す", (_label, expiresAt) => {
    const path = writeCookies([
      { name: "sb-testref-auth-token", value: encodeSession({ expires_at: expiresAt }) },
    ]);

    expect(readStoredSessionExpiry(path)).toEqual({ kind: "expires-at-invalid", value: expiresAt });
  });
});
