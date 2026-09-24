import fs from "node:fs";

import {
  buildVisitorIndex,
  readVisitorStyleAssets,
  readImageVersions,
  VISITOR_SOURCE_PATHS
} from "./lib/visitor-source.mjs";

function main() {
  const next = buildVisitorIndex();
  const assetFile = new URL('../server/asset-versions.json', import.meta.url);
  const assets = JSON.stringify(readImageVersions(), null, 2) + '\n';
  const styles = readVisitorStyleAssets();
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    const current = fs.readFileSync(VISITOR_SOURCE_PATHS.index, "utf8");
    if (current !== next || !fs.existsSync(assetFile) || fs.readFileSync(assetFile, 'utf8') !== assets || styles.some(asset => !fs.existsSync(asset.file) || fs.readFileSync(asset.file,'utf8') !== asset.css)) {
      console.error("index.html is out of sync with src/visitor sources. Run npm run build:visitor.");
      process.exit(1);
    }
    console.log("index.html matches src/visitor sources.");
    return;
  }

  fs.writeFileSync(VISITOR_SOURCE_PATHS.index, next);
  fs.writeFileSync(assetFile, assets);
  for (const asset of styles) {
    fs.mkdirSync(new URL('.',asset.file),{recursive:true});
    fs.writeFileSync(asset.file,asset.css);
  }
  console.log("Generated index.html from src/visitor sources.");
}

main();
