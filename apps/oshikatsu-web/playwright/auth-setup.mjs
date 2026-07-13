import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const baseURL = "http://localhost:3001";
const cdpPort = 9222;
const relayPort = 9223;
const authFile = fileURLToPath(new URL("./.auth/user.json", import.meta.url));
const relayFile = fileURLToPath(new URL("./cdp-relay.ps1", import.meta.url));

if (process.env.CI) {
  throw new Error("認証状態の保存はローカル環境でのみ実行できます。");
}

const getWindowsLocalAppData = () =>
  execFileSync("cmd.exe", ["/d", "/c", "echo", "%LOCALAPPDATA%"], {
    cwd: "/mnt/c",
    encoding: "utf8",
  }).trim();

const getWindowsHostAddress = () => {
  const defaultRoute = execFileSync("ip", ["route", "show", "default"], {
    encoding: "utf8",
  });
  const gateway = defaultRoute.match(/\bvia\s+(\S+)/)?.[1];

  if (!gateway) {
    throw new Error("WSLからWindowsへ接続するアドレスを取得できませんでした。");
  }

  return gateway;
};

const getChromeSettings = () => {
  const windowsChrome =
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";

  if (existsSync(windowsChrome)) {
    const windowsHostAddress = getWindowsHostAddress();

    return {
      cdpHost: windowsHostAddress,
      executablePath: windowsChrome,
      isWindowsChrome: true,
      userDataDir: `${getWindowsLocalAppData()}\\Sakalog\\PlaywrightChrome`,
    };
  }

  const linuxChrome = "/usr/bin/google-chrome";

  if (existsSync(linuxChrome)) {
    return {
      cdpHost: "127.0.0.1",
      executablePath: linuxChrome,
      isWindowsChrome: false,
      userDataDir: join(process.env.HOME ?? "/tmp", ".sakalog-playwright-chrome"),
    };
  }

  throw new Error("通常の Google Chrome を見つけられませんでした。");
};

const readCdpVersion = async (isWindowsChrome) => {
  if (isWindowsChrome) {
    const result = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:${cdpPort}/json/version).Content`,
      ],
      { cwd: "/mnt/c", encoding: "utf8" },
    );

    return JSON.parse(result.trim());
  }

  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);

  if (!response.ok) {
    throw new Error(`Chrome CDP returned ${response.status}`);
  }

  return response.json();
};

const waitForCdp = async (isWindowsChrome) => {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      return await readCdpVersion(isWindowsChrome);
    } catch {
      // Chrome の起動完了まで待つ。
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Chrome のCDPエンドポイントへ接続できませんでした。");
};

const getWebSocketDebuggerURL = (version) => {
  if (
    typeof version !== "object" ||
    version === null ||
    !("webSocketDebuggerUrl" in version) ||
    typeof version.webSocketDebuggerUrl !== "string"
  ) {
    throw new Error("Chrome CDPの応答形式が不正です。");
  }

  return version.webSocketDebuggerUrl;
};

const startCdpRelay = (cdpHost) => {
  const windowsRelayFile = execFileSync("wslpath", ["-w", relayFile], {
    encoding: "utf8",
  }).trim();
  const relay = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      windowsRelayFile,
      "-ListenAddress",
      cdpHost,
      "-ListenPort",
      String(relayPort),
      "-TargetPort",
      String(cdpPort),
    ],
    {
      cwd: "/mnt/c",
      detached: true,
      stdio: "ignore",
    },
  );
  relay.unref();
};

const getConnectURL = async ({ cdpHost, isWindowsChrome }) => {
  const version = await readCdpVersion(isWindowsChrome);
  const webSocketURL = new URL(getWebSocketDebuggerURL(version));

  if (isWindowsChrome) {
    startCdpRelay(cdpHost);
    webSocketURL.hostname = cdpHost;
    webSocketURL.port = String(relayPort);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return webSocketURL.toString();
};

const { cdpHost, executablePath, isWindowsChrome, userDataDir } =
  getChromeSettings();
const chrome = spawn(
  executablePath,
  [
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${cdpPort}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run",
    "--no-default-browser-check",
    baseURL,
  ],
  {
    detached: true,
    stdio: "ignore",
  },
);
chrome.unref();

await waitForCdp(isWindowsChrome);

const terminal = createInterface({ input, output });

try {
  output.write(
    [
      "",
      "専用プロファイルの Google Chrome を起動しました。",
      "このChrome上で手動Googleログインを完了してください。",
      "Sakalogのトップページが表示されたら、このターミナルで Enter を押してください。",
      `Chrome profile: ${userDataDir}`,
      "",
    ].join("\n"),
  );

  await terminal.question("");

  const connectURL = await getConnectURL({ cdpHost, isWindowsChrome });
  const browser = await chromium.connectOverCDP(connectURL);

  try {
    const context = browser.contexts()[0];

    if (!context) {
      throw new Error("認証済みChromeのBrowserContextを取得できませんでした。");
    }

    const hasAuthenticatedSakalogPage = context.pages().some((page) => {
      const currentURL = new URL(page.url());

      return currentURL.origin === baseURL && currentURL.pathname !== "/login";
    });

    if (!hasAuthenticatedSakalogPage) {
      throw new Error("認証後のSakalogトップページを確認できませんでした。");
    }

    await mkdir(dirname(authFile), { recursive: true });
    await context.storageState({ path: authFile });
    await chmod(authFile, 0o600);
    output.write(`認証状態を保存しました: ${authFile}\n`);
  } finally {
    await browser.close();
  }
} finally {
  terminal.close();
}
