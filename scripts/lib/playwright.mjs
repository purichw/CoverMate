import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CODEX_PLAYWRIGHT_PATH =
  "/Users/point/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";

export function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    return require(CODEX_PLAYWRIGHT_PATH);
  }
}

