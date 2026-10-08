import {spawnSync} from 'node:child_process';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') throw new Error('Isolated emulator required');
for(const file of ['rules-behavior-check.mjs','cms-api-check.mjs','customers-api-check.mjs','cases-api-check.mjs','nfr-e2e.mjs']) {
  const run=spawnSync(process.execPath,['scripts/'+file],{stdio:'inherit',env:{...process.env,COVERMATE_TEST_MODE:'emulator',COVERMATE_NFR_BROWSER:'chromium'}});
  if(run.status!==0)process.exit(run.status||1);
}
