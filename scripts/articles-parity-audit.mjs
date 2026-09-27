// Integration parity must exercise the production API and actual server repository.
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator') {
  throw Error('Run through isolated Auth/Firestore emulators with COVERMATE_TEST_MODE=emulator. Add --browser for real CMS/Visitor journeys.');
}
await import('./articles-api-check.mjs');
if(process.argv.includes('--browser'))await import('./articles-cloud-e2e.mjs');
