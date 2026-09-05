const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function isEmulator() {
  return process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8088' && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9098' && process.env.COVERMATE_TEST_MODE === 'emulator' && !process.env.VERCEL;
}
function serverApp() {
  if (getApps().length) return getApps()[0];
  const emulator = isEmulator();
  if (!emulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Invalid emulator configuration.');
  const raw = process.env.COVERMATE_SERVER_CREDENTIALS;
  return initializeApp({
    projectId: emulator ? 'demo-covermate' : 'covermate-purich',
    ...(emulator ? {} : { credential: raw ? cert(JSON.parse(raw)) : applicationDefault() })
  });
}

exports.serverApp = serverApp;
exports.serverDb = () => getFirestore(serverApp());
exports.isEmulator = isEmulator;
