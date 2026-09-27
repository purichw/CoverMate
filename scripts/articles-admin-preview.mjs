import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startStaticServer, REPO_ROOT } from './lib/static-server.mjs';
import { firebaseMock, createLegacyOpsState } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { adminArticleFixture } from './fixtures/home-articles/admin-feed.mjs';
import { editorArticleFixture } from './fixtures/home-articles/editor-feed.mjs';
import cases from '../server/cases-contract.cjs';

export async function startArticlesAdminPreview() {
  let catalog = structuredClone(adminArticleFixture), failure = 0, delay = 0;
  const legacy = createLegacyOpsState(), fixture = createCasesFixture();
  const requests = [];
  const result = await startStaticServer({
    headers: { 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'none'; frame-src 'none'" },
    async onRequest(req, res) {
      const url = new URL(req.url, 'http://localhost');
      const send = (type, data, status = 200) => { res.writeHead(status, { 'Content-Type': type }); res.end(data); return true; };
      if (!['GET', 'HEAD'].includes(req.method)) { requests.push({ path: url.pathname, method: req.method }); return send('application/json', '{"error":"Preview is read-only"}', 405); }
      if (['/admin', '/admin/', '/admin/index.html'].includes(url.pathname)) {
        const html = await fs.readFile(path.join(REPO_ROOT, 'admin/index.html'), 'utf8');
        const seed = `<script>localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'article-preview',email:'preview@example.test',name:'CoverMate Preview',role:'admin',exp:Date.now()+3600000}));</script>`;
        return send('text/html', html.replace('<head>', '<head>' + seed));
      }
      if (url.pathname === '/covermate-firebase.js') return send('text/javascript', firebaseMock);
      if (url.pathname === '/admin/articles/data.mjs') return send('text/javascript', `export async function loadArticleCatalog(){const response=await fetch('/__preview/articles');if(!response.ok){const error=new Error('Preview failure');error.status=response.status;throw error;}return response.json();} export async function loadArticleForEditor(id){return (await (await fetch('/__preview/article/'+encodeURIComponent(id))).json());}`);
      if(url.pathname.startsWith('/__preview/article/')) return send('application/json',JSON.stringify(editorArticleFixture(catalog.items.find(item=>item.id===decodeURIComponent(url.pathname.split('/').at(-1))))));
      if (url.pathname === '/__preview/articles') {
        const response = JSON.stringify(catalog), status = failure;
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        return send('application/json', status ? '{}' : response, status || 200);
      }
      if (url.pathname.startsWith('/assets/article-preview/')) {
        const name = url.pathname.split('/').at(-1);
        if (!['motor.jpg', 'health.jpg', 'travel.jpg'].includes(name)) return send('text/plain', 'Missing preview image', 404);
        return send('image/jpeg', await fs.readFile(path.join(REPO_ROOT, 'scripts/fixtures/home-articles', name)));
      }
      if (url.pathname.startsWith('/api/')) {
        const resource = url.pathname.replace('/api/ops/', '');
        let data = { rows: legacy[resource] || [] };
        if (resource === 'cases/summary') data = cases.summary(fixture.cases, fixture.asOf);
        if (resource === 'cases') data = cases.listCases(fixture.cases, url.searchParams, fixture.asOf);
        if (resource === 'notifications') data = { items: [], unreadCount: 0, nextCursor: null };
        if (resource === 'notification-capabilities') data = { inAppAvailable: true, emailAvailable: false };
        return send('application/json', JSON.stringify(data));
      }
      return false;
    }
  });
  return { ...result, requests, setCatalog(value) { catalog = structuredClone(value); }, setFailure(value) { failure = value; }, setDelay(value) { delay = value; } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { baseUrl } = await startArticlesAdminPreview();
  console.log(`${baseUrl}/admin#articles\nLocal design preview only. Synthetic login, read-only sample articles, no production connections.`);
}
