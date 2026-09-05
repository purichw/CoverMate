import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Rules tests require an emulator.');
const env = await initializeTestEnvironment({ projectId: 'demo-covermate', firestore: { host: '127.0.0.1', port: 8088, rules: fs.readFileSync('firestore.rules', 'utf8') } });
try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const role of ['owner', 'advisor', 'ops', 'readonly', 'unknown']) await setDoc(doc(db, 'admins', role), { active: true, role });
    await setDoc(doc(db, 'admins', 'inactive'), { active: false, role: 'owner' });
    await setDoc(doc(db, 'admins', 'uat-owner'), { active: true, role: 'owner', uatOnly: true });
    for (const site of ['covermate', 'covermate-uat']) {
      await setDoc(doc(db, 'sites', site, 'states', 'draft'), { revision: 1, config: {}, text: {} });
      await setDoc(doc(db, 'sites', site, 'states', 'live'), { revision: 1, config: {}, text: {} });
    }
  });
  const publicDb = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, 'sites/covermate/states/live')));
  await assertFails(getDoc(doc(publicDb, 'sites/covermate/states/draft')));
  await assertFails(setDoc(doc(publicDb, 'contactLeads/spam'), { contact: 'x', consent: true }));
  for (const uid of ['advisor', 'ops', 'readonly', 'unknown', 'inactive', 'uat-owner']) {
    const db = env.authenticatedContext(uid).firestore();
    await assertFails(updateDoc(doc(db, 'sites/covermate/states/draft'), { revision: 2 }));
  }
  const owner = env.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(owner, 'sites/covermate/analytics/settings'), { enabled: true }));
  await assertFails(setDoc(doc(env.authenticatedContext('readonly').firestore(), 'sites/covermate/analytics/settings'), { enabled: false }));
  await assertSucceeds(updateDoc(doc(owner, 'sites/covermate/states/draft'), { revision: 2, text: { blank: '' } }));
  await assertFails(updateDoc(doc(owner, 'sites/covermate/states/draft'), { revision: 2, text: { overwritten: true } }));
  assert.equal((await getDoc(doc(owner, 'sites/covermate/states/draft'))).data().text.blank, '');
  const uat = env.authenticatedContext('uat-owner').firestore();
  await assertSucceeds(updateDoc(doc(uat, 'sites/covermate-uat/states/draft'), { revision: 2 }));
  const version = doc(owner, `sites/covermate/versions/test-${Date.now()}`);
  await assertSucceeds(setDoc(version, { config: {}, text: {} }));
  await assertFails(updateDoc(version, { text: { rewrite: true } }));
  await assertFails(setDoc(doc(publicDb, 'abuseLimits/test'), {}));
  await assertFails(getDoc(doc(env.authenticatedContext('unknown').firestore(), 'contactLeads/x')));
  console.log('Firestore emulator: public, roles, UAT isolation, revision and immutable history checks passed.');
} finally { await env.cleanup(); }
