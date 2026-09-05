import { spawnSync } from 'node:child_process';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') throw new Error('Missing isolated emulator.');
for (const file of ['scripts/rules-behavior-check.mjs', 'scripts/nfr-api-check.mjs', 'scripts/nfr-e2e.mjs', 'scripts/nfr-journeys.mjs']) {
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit', env: { ...process.env, COVERMATE_TEST_MODE: 'emulator' } });
  if (result.status !== 0) process.exit(result.status || 1);
}
