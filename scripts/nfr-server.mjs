import { createRequire } from 'node:module';
import fs from 'node:fs';
import { startStaticServer } from './lib/static-server.mjs';
const require = createRequire(import.meta.url);
export async function startNfrServer() {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const headers = Object.fromEntries(config.headers.find(item => item.source === '/(.*)').headers.map(item => [item.key, item.value]));
  // Local integration uses real Auth/Firestore emulators, not a production bypass.
  headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8088 http://127.0.0.1:9098");
  if (process.env.COVERMATE_TEST_MODE === 'emulator') headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace('frame-src ', 'frame-src http://127.0.0.1:9098 ');
  return startStaticServer({ ownerRoutesToRoot: true, headers, onRequest: async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const name = pathname.startsWith('/api/ops') ? 'ops' : pathname.slice(5);
    if (!pathname.startsWith('/api/') || !['leads', 'ops', 'analytics', 'telemetry'].includes(name)) return false;
    await require(`../api/${name}.js`)(req, res);
    return true;
  } });
}
if (process.argv.includes('--serve')) {
  const { baseUrl } = await startNfrServer();
  console.log(baseUrl);
}
