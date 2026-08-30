import fs from "node:fs";

import {
  buildVisitorIndex,
  VISITOR_SOURCE_PATHS
} from "./lib/visitor-source.mjs";

function main() {
  const next = buildVisitorIndex();
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    const current = fs.readFileSync(VISITOR_SOURCE_PATHS.index, "utf8");
    if (current !== next) {
      console.error("index.html is out of sync with src/visitor sources. Run npm run build:visitor.");
      process.exit(1);
    }
    console.log("index.html matches src/visitor sources.");
    return;
  }

  fs.writeFileSync(VISITOR_SOURCE_PATHS.index, next);
  console.log("Generated index.html from src/visitor sources.");
}

main();
