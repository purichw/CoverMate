export const FIREBASE_VERSION = '12.16.0';
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyDpHoXdw0T8UUqNH6-OAhqT-XEJgwmzGIM',
  authDomain: 'covermate-purich.firebaseapp.com',
  projectId: 'covermate-purich',
  storageBucket: 'covermate-purich.firebasestorage.app',
  messagingSenderId: '7468452473',
  appId: '1:7468452473:web:52b47eef5362d4029fe2a8',
  measurementId: 'G-5TF3C235EF'
});

// Emulator opt-in only exists on loopback and never changes production auth.
export function emulatorEnabled() {
  if (typeof location === 'undefined' || !['localhost', '127.0.0.1'].includes(location.hostname)) return false;
  if (new URLSearchParams(location.search).get('cm_emulator') === '1') sessionStorage.setItem('covermate-emulator', '1');
  return sessionStorage.getItem('covermate-emulator') === '1';
}

export function firebaseConfig() {
  return emulatorEnabled() ? { ...FIREBASE_CONFIG, projectId: 'demo-covermate', apiKey: 'demo-key' } : FIREBASE_CONFIG;
}

export function publicFirestoreRoot() {
  return emulatorEnabled()
    ? 'http://127.0.0.1:8088/v1/projects/demo-covermate/databases/(default)/documents'
    : 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
}
