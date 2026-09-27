import { spawnSync } from 'node:child_process';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') throw new Error('Missing isolated emulator.');
// Install rules first. Cases owns namespaced fixtures and tolerates earlier
// intake records, so its assertions no longer depend on an empty collection.
const checks = ['scripts/rules-behavior-check.mjs', 'scripts/nfr-api-check.mjs', 'scripts/cases-api-check.mjs', 'scripts/admin-notification-check.mjs', 'scripts/admin-email-scheduler-check.mjs'];
checks.push(...(process.argv.includes('--fixture-isolation')
  ? ['scripts/cases-api-check.mjs']
  : ['scripts/nfr-e2e.mjs', 'scripts/nfr-journeys.mjs']));
checks.push('scripts/contact-intake-check.mjs', 'scripts/customer-email-check.mjs');
for (const file of checks) {
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit', env: { ...process.env, COVERMATE_TEST_MODE: 'emulator' } });
  if (result.status !== 0) process.exit(result.status || 1);
}
