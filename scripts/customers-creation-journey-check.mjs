import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9098') throw new Error('Isolated customer emulators required.');
const env = { ...process.env, COVERMATE_TEST_MODE: 'emulator' };
const preview = spawn(process.execPath, ['scripts/customers-admin-preview.mjs'], { env, stdio: ['ignore', 'pipe', 'inherit'] });
const exit = once(preview, 'exit');
try {
  const baseUrl = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Customer preview did not become ready within 30 seconds.')), 30000);
    preview.once('error', error => { clearTimeout(timer); reject(error); });
    preview.once('exit', code => { clearTimeout(timer); reject(new Error(`Customer preview exited early: ${code}`)); });
    preview.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+(?=\/admin)/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  for (const script of ['customers-new-design-check', 'customers-review-check', 'customers-success-check']) {
    const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], { stdio: 'inherit', env: { ...env, CUSTOMER_PREVIEW_URL: baseUrl } });
    if (result.status !== 0) throw new Error(`${script} exited with ${result.status}`);
  }
} finally {
  if (preview.exitCode === null) preview.kill('SIGTERM');
  await exit;
}
