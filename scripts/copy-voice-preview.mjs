import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startStaticServer, REPO_ROOT } from './lib/static-server.mjs';

export async function startCopyPreview(state) {
  return startStaticServer({
    headers: { 'Cache-Control': 'no-store', 'Content-Security-Policy': "connect-src 'self'; form-action 'none'" },
    async onRequest(req, res) {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const send = (type, content, status = 200) => {
        res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` }); res.end(content); return true;
      };
      if (!['GET', 'HEAD'].includes(req.method) || pathname.startsWith('/api/')) return send('application/json', '{"error":"Read-only copy preview"}', 503);
      if (pathname.startsWith('/admin')) return send('text/plain', 'This preview contains public copy only.', 403);
      if (pathname === '/covermate-firebase.js') return send('text/javascript', 'export {};');
      if (pathname === '/covermate-public.mjs') return send('text/javascript', `
        const state = ${JSON.stringify(state)};
        export function startLiveContentSync() {}
        export function stopLiveContentSync() {}
        export async function hydrateLocalContent() {
          window.__covermateLiveState = structuredClone(state);
          localStorage.setItem('purich-live-config-v3', JSON.stringify(state.config));
          localStorage.setItem('purich-live-text-v3', JSON.stringify(state.text || {}));
          return {live: state, publicLive: true};
        }
        export async function prepareContactLead() {throw new Error('Read-only copy preview');}
        export async function sendContactLead() {throw new Error('Read-only copy preview');}
        export async function submitContactLead() {throw new Error('Read-only copy preview');}
      `);
      return false;
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const filename = process.argv[2] || path.join(REPO_ROOT, 'uat-results/copy-audit-20260927/copy-draft.json');
  const { baseUrl } = await startCopyPreview(JSON.parse(fs.readFileSync(filename, 'utf8')));
  console.log(`${baseUrl}/\n${baseUrl}/motor\nRead-only local copy draft. No CMS or customer-data writes.`);
}
