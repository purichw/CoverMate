import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync(new URL('./cases/fixtures.json', import.meta.url), 'utf8'));

// Fresh object graphs prevent one scenario's mutations leaking into another.
// A namespace also lets API suites coexist in the same disposable emulator.
export function createCasesFixture(namespace = '') {
  if (namespace && !/^[a-zA-Z0-9_-]{1,48}$/.test(namespace)) throw new Error('Invalid Cases fixture namespace.');
  const fixture = structuredClone(source);
  if (!namespace) return fixture;
  const id = value => `${namespace}-${value}`;
  const caseIds = new Map(fixture.cases.map(record => [record.id, id(record.id)]));
  for (const record of fixture.cases) record.id = caseIds.get(record.id);
  for (const activity of fixture.activities) {
    activity.id = id(activity.id);
    activity.caseId = caseIds.get(activity.caseId);
  }
  for (const notice of fixture.notifications) {
    notice.id = id(notice.id);
    notice.dedupeKey = notice.dedupeKey.replace(notice.caseId, caseIds.get(notice.caseId));
    notice.caseId = caseIds.get(notice.caseId);
  }
  return fixture;
}
