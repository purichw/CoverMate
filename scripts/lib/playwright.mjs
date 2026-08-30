import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const CODEX_PLAYWRIGHT_PATH =
  "/Users/point/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const DEFAULT_MAC_CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    return require(CODEX_PLAYWRIGHT_PATH);
  }
}

export function resolveChromeExecutablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    DEFAULT_MAC_CHROME_PATH
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || undefined;
}

export function chromiumLaunchOptions(options = {}) {
  const executablePath = options.executablePath || resolveChromeExecutablePath();
  return executablePath ? { ...options, executablePath } : { ...options };
}

export async function launchChromium(chromium, options = {}) {
  return chromium.launch(chromiumLaunchOptions(options));
}
