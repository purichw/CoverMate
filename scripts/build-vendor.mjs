import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
fs.mkdirSync('assets/vendor', { recursive: true });
for (const name of ['react', 'react-dom']) {
  const root = path.dirname(require.resolve(`${name}/package.json`));
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (version !== '18.3.1') throw new Error('Review the exported runtime before upgrading React.');
  fs.copyFileSync(path.join(root, 'umd', `${name}.production.min.js`), `assets/vendor/${name}-${version}.min.js`);
  fs.copyFileSync(path.join(root, 'LICENSE'), `assets/vendor/${name}-LICENSE.txt`);
}
for (const file of ['src/visitor/shell.html', 'admin/login/index.html']) {
const source = fs.readFileSync(file, 'utf8');
const selector = '<script type="__bundler/ext_resources">';
const start = source.indexOf(selector) + selector.length;
const end = source.indexOf('</script>', start);
if (start < selector.length || end < start) throw new Error('Missing resource manifest.');
const resources = JSON.parse(source.slice(start, end));
for (const resource of resources) {
  for (const name of ['react', 'react-dom']) {
    const original = `https://unpkg.com/${name}@18.3.1/umd/${name}.production.min.js`;
    const local = `/assets/vendor/${name}-18.3.1.min.js`;
    if (resource.id === original || resource.id === local) {
      resource.id = original;
      resource.url = local;
    }
  }
}
const next = source.slice(0, start) + JSON.stringify(resources) + source.slice(end);
if (next !== source) fs.writeFileSync(file, next);
}
console.log('Vendored pinned React UMD assets and licences.');
