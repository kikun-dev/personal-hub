// #482 / CF-LIVE-006 の回帰固定テスト。
// Server Component が `"use client"` module から関数以外の値（class文字列）を
// importすると、その値がClient Reference proxyになり、runtimeのclass属性へ
// `Attempted to call ... from the server` というエラー文字列が混入していた。
// この不具合が再発しないよう、
// 1. interactionStyles.ts が `"use client"` を持たないserver-safe moduleであること
// 2. exportされた各tokenがplain stringで、Client Reference混入エラーを含まないこと
// 3. リポジトリ内のどのファイルも "use client" moduleである PendingLink / TextLink
//    から style token（旧名・新名とも）をimportしていないこと
//    （コンポーネント本体のimportは許可し、誤検知しない）
// 4. focusRing.ts（re-export）と interactionStyles.ts で focusRingClass が
//    同一値であること
// を静的検査＋実値検証で担保する。
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "..", "..");
const SCAN_DIR_NAMES = ["components", "app", "lib", "usecases"];
const EXCLUDED_DIR_NAMES = new Set(["node_modules", ".next"]);
const SOURCE_FILE_PATTERN = /\.(tsx|ts)$/;

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (SOURCE_FILE_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const sourceFiles = SCAN_DIR_NAMES.flatMap((dirName) =>
  collectSourceFiles(path.join(APP_ROOT, dirName))
);

// 旧名（export削除済み）・新名（interactionStyles.ts側）の両方を、
// PendingLink / TextLink からimportしていないか検査する対象にする。
const STYLE_TOKEN_NAMES = [
  "LINK_FOCUS_CLASS",
  "TEXT_LINK_CLASS",
  "TEXT_ACTION_CLASS",
  "focusRingClass",
  "textLinkClass",
  "textActionClass",
  "standaloneTargetMinHeightClass",
  "standaloneTargetClass",
  "inlineTargetClass",
];

// "use client" module（コンポーネント本体のimportは許可対象）
const CLIENT_COMPONENT_MODULES = [
  "@/components/ui/PendingLink",
  "@/components/ui/TextLink",
];

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `import { A, B as C } from "modulePath"` 形式から named import 名の一覧を取り出す。
// default import やコンポーネント本体（PendingLink / TextLink）のimportは
// STYLE_TOKEN_NAMES に含まれないため誤検知しない。
function extractNamedImports(content: string, modulePath: string): string[] {
  const importRegex = new RegExp(
    `import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s+from\\s+["']${escapeForRegExp(modulePath)}["']`,
    "g"
  );
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    const specifierList = match[1] ?? "";
    for (const rawSpecifier of specifierList.split(",")) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, "");
      if (!specifier) continue;
      const localName = specifier.split(/\s+as\s+/)[0]?.trim();
      if (localName) names.push(localName);
    }
  }

  return names;
}

describe("interactionStyles.ts (#482)", () => {
  const interactionStylesPath = path.join(
    APP_ROOT,
    "components/ui/interactionStyles.ts"
  );
  const interactionStylesSource = readFileSync(interactionStylesPath, "utf-8");

  it('"use client" ディレクティブを持たない（server-safe moduleであること）', () => {
    // コメント中の `"use client"` という言及（なぜserver-safeにしたかの説明）は
    // 許容し、実際のdirective行（1行がまるごと "use client"; であるもの）だけを
    // 検出する。
    const directiveLinePattern = /^\s*["']use client["'];?\s*$/m;
    expect(interactionStylesSource).not.toMatch(directiveLinePattern);
  });

  it("exportされた各tokenがplain stringで、Client Reference混入エラーを含まない", async () => {
    const tokens = await import("@/components/ui/interactionStyles");
    const exportedNames = Object.keys(tokens);

    expect(exportedNames.length).toBeGreaterThan(0);

    for (const name of exportedNames) {
      const value = tokens[name as keyof typeof tokens];
      expect(typeof value, `${name} should be a plain string`).toBe("string");
      expect(value as string).not.toContain("Attempted to call");
    }
  });

  it("focusRing.ts と interactionStyles.ts で focusRingClass が同一値である", async () => {
    const fromFocusRing = await import("@/components/ui/focusRing");
    const fromInteractionStyles = await import(
      "@/components/ui/interactionStyles"
    );

    expect(fromFocusRing.focusRingClass).toBe(
      fromInteractionStyles.focusRingClass
    );
  });

  it("PendingLink / TextLink から style token をimportしているファイルが存在しない", () => {
    const offendingImports: string[] = [];

    for (const filePath of sourceFiles) {
      // このテストファイル自体は STYLE_TOKEN_NAMES を文字列として保持しているが
      // import文ではないため対象外（誤検知防止のため念のため除外しておく）。
      if (filePath === path.join(APP_ROOT, "components/ui/interactionStyles.test.ts")) {
        continue;
      }

      const content = readFileSync(filePath, "utf-8");

      for (const modulePath of CLIENT_COMPONENT_MODULES) {
        const importedNames = extractNamedImports(content, modulePath);
        const styleTokenImports = importedNames.filter((name) =>
          STYLE_TOKEN_NAMES.includes(name)
        );

        for (const styleTokenName of styleTokenImports) {
          offendingImports.push(
            `${path.relative(APP_ROOT, filePath)}: imports "${styleTokenName}" from "${modulePath}"`
          );
        }
      }
    }

    expect(offendingImports).toEqual([]);
  });
});
