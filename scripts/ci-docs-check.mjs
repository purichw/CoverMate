import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDocsOnly } from './lib/ci-policy.mjs';

export function checkDocs(base, {
  git = args => execFileSync('git', args, { encoding: 'utf8' }),
  read = file => readFileSync(file, 'utf8'),
  exists = existsSync
} = {}) {
  assert.match(base || '', /^[a-f0-9]{40}$/);
  const files = git(['diff', '--no-renames', '--name-only', '-z', base, 'HEAD']).split('\0').filter(Boolean);
  assert.ok(isDocsOnly(files), 'Docs path must contain only allowlisted Markdown changes.');
  git(['diff', '--check', base, 'HEAD']);
  let links = 0;
  for (const file of files) {
    if (!exists(file)) continue; // Deleted docs have no links to inspect.
    const body = read(file).replace(/```[\s\S]*?```/g, '');
    for (const match of body.matchAll(/\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1].replace(/^<|>$/g, '');
      // Local absolute links are author-machine evidence, not portable repo links.
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
      const relative = decodeURIComponent(target.split('#')[0]);
      if (!relative) continue;
      const destination = path.resolve(path.dirname(file), relative);
      assert.ok(exists(destination), `${file}: missing relative link ${target}`);
      links++;
    }
  }
  return { files: files.length, links };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const result = checkDocs(process.env.CI_BASE_SHA);
  console.log(`PASS: ${result.files} documentation paths, ${result.links} relative links; no runtime changes.`);
}
