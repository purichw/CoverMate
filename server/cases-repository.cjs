const { serverDb } = require('./firebase.cjs');
const C = require('./cases-contract.cjs');

// Keep the existing namespace mapping and complete small-dataset scan.
function stores(actor) {
  const db = serverDb();
  const suffix = actor.environment?.isUat ? 'Uat' : '';
  return {
    db,
    cases: db.collection(actor.environment?.leadCollection || 'contactLeads'),
    notifications: db.collection(`caseNotifications${suffix}`),
    preferences: db.collection(`casePreferences${suffix}`)
  };
}

async function recordsFor(actor) {
  const snap = await stores(actor).cases.get();
  return snap.docs.map(doc => C.adaptCase(doc.id, doc.data()));
}

module.exports = { stores, recordsFor };
