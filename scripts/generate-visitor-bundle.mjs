import fs from "node:fs";
import { readBootSurface } from './lib/boot-surface.mjs';
import {buildArticleImages} from './build-article-images.mjs';

import {
  buildVisitorIndex,
  readVisitorSources,
  readVisitorStyleAssets,
  readSelectAsset,
  readArticleSearchAsset,
  readAnalyticsAsset,
  readEditorPreviewAsset,
  readEditorVersionsAsset,
  readContactPayloadAsset,
  readPublicContractAsset,
  readPublicRuntimeAssets,
  readArticleReaderAsset,
  readImageVersions,
  VISITOR_SOURCE_PATHS
} from "./lib/visitor-source.mjs";

function main() {
  const sources = readVisitorSources();
  const next = buildVisitorIndex(sources);
  const publicIndex = buildVisitorIndex(sources, { publicOnly: true });
  const assetFile = new URL('../server/asset-versions.json', import.meta.url);
  const assets = JSON.stringify(readImageVersions(), null, 2) + '\n';
  const styles = readVisitorStyleAssets();
  const select = readSelectAsset();
  const search = readArticleSearchAsset();
  const analytics = readAnalyticsAsset();
  const editorPreview = readEditorPreviewAsset();
  const editorVersions = readEditorVersionsAsset();
  const payload = readContactPayloadAsset();
  const publicContract = readPublicContractAsset();
  const publicRuntime = readPublicRuntimeAssets();
  const articleReader = readArticleReaderAsset();
  const articleFeed = readArticleReaderAsset({ feedOnly: true });
  const adminFile = new URL('../admin/index.html', import.meta.url);
  const admin = fs.readFileSync(adminFile,'utf8');
  const adminSlot = /<!-- COVERMATE_SELECT_ASSETS_START -->[\s\S]*?<!-- COVERMATE_SELECT_ASSETS_END -->/g;
  if ([...admin.matchAll(adminSlot)].length !== 1) throw new Error('Admin shared select asset slot must exist exactly once.');
  let nextAdmin = admin.replace(adminSlot,`<!-- COVERMATE_SELECT_ASSETS_START -->\n  ${styles.find(asset=>asset.name==='select').link}\n  <script type="module" src="${select.url}"></script>\n  <!-- COVERMATE_SELECT_ASSETS_END -->`);
  const boot = readBootSurface({ loadingTh: 'กำลังตรวจสอบสิทธิ์และเตรียมหน้า Admin', loadingEn: 'Verifying access and preparing Admin' });
  for (const [slot, content] of Object.entries({
    STYLE: `<style id="covermate-boot-style">${boot.css}</style>`,
    SURFACE: `${boot.html}<script>${boot.script}</script>`
  })) {
    const pattern = new RegExp(`<!-- COVERMATE_BOOT_${slot}_START -->[\\s\\S]*?<!-- COVERMATE_BOOT_${slot}_END -->`, 'g');
    if ([...nextAdmin.matchAll(pattern)].length !== 1) throw new Error(`Admin boot ${slot} slot must exist exactly once.`);
    nextAdmin = nextAdmin.replace(pattern, () => `<!-- COVERMATE_BOOT_${slot}_START -->\n${content}\n  <!-- COVERMATE_BOOT_${slot}_END -->`);
  }
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    const current = fs.readFileSync(VISITOR_SOURCE_PATHS.index, "utf8");
    if (current !== next || !fs.existsSync(VISITOR_SOURCE_PATHS.publicIndex) || readPublicIndex() !== publicIndex || admin !== nextAdmin || !fs.existsSync(assetFile) || fs.readFileSync(assetFile, 'utf8') !== assets || [select, search, analytics, editorPreview, editorVersions, payload, publicContract, articleReader, articleFeed, ...publicRuntime].some(asset => !fs.existsSync(asset.file) || fs.readFileSync(asset.file,'utf8') !== asset.code) || styles.some(asset => !fs.existsSync(asset.file) || fs.readFileSync(asset.file,'utf8') !== asset.css)) {
      console.error("Visitor/owner artifacts are out of sync with src/visitor sources. Run npm run build:visitor.");
      process.exit(1);
    }
    console.log("index.html matches src/visitor sources.");
    return;
  }

  fs.writeFileSync(VISITOR_SOURCE_PATHS.index, next);
  fs.writeFileSync(VISITOR_SOURCE_PATHS.publicIndex, publicIndex);
  fs.writeFileSync(assetFile, assets);
  for (const asset of styles) {
    fs.mkdirSync(new URL('.',asset.file),{recursive:true});
    fs.writeFileSync(asset.file,asset.css);
  }
  fs.writeFileSync(select.file,select.code);
  fs.writeFileSync(search.file,search.code);
  fs.writeFileSync(analytics.file,analytics.code);
  fs.writeFileSync(editorPreview.file,editorPreview.code);
  fs.writeFileSync(editorVersions.file,editorVersions.code);
  fs.writeFileSync(payload.file,payload.code);
  fs.writeFileSync(publicContract.file,publicContract.code);
  for (const asset of publicRuntime) fs.writeFileSync(asset.file,asset.code);
  fs.writeFileSync(articleReader.file,articleReader.code);
  fs.writeFileSync(articleFeed.file,articleFeed.code);
  if (admin !== nextAdmin) fs.writeFileSync(adminFile,nextAdmin);
  console.log("Generated index.html and server/visitor-public.html from src/visitor sources.");
}

function readPublicIndex() { return fs.readFileSync(VISITOR_SOURCE_PATHS.publicIndex, 'utf8'); }

await buildArticleImages({check:process.argv.includes('--check')});
main();
