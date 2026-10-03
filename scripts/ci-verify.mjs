import { appendFileSync } from 'node:fs';
import { verifyCiNeeds } from './lib/ci-policy.mjs';

const mode = verifyCiNeeds(JSON.parse(process.env.CI_NEEDS_JSON));
const result = mode === 'docs'
  ? 'PASS: documentation checked; unchanged runtime reuses the verified base run reported by scope. App suites were intentionally not rerun.'
  : 'PASS: preflight, all browser suites and real Auth/Rules/API/Publish emulators succeeded for this revision.';
console.log(result);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result + '\n');
