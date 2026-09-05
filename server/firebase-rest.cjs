const local = process.env.COVERMATE_TEST_MODE === 'emulator' && !process.env.VERCEL
  && process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8088'
  && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9098';
const PROJECT_ID = local ? 'demo-covermate' : 'covermate-purich';
const key = local ? 'demo-key' : 'AIzaSyDpHoXdw0T8UUqNH6-OAhqT-XEJgwmzGIM';
module.exports = {
  PROJECT_ID,
  FIRESTORE_ROOT: `${local ? 'http://127.0.0.1:8088' : 'https://firestore.googleapis.com'}/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  IDENTITY_ROOT: `${local ? 'http://127.0.0.1:9098/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com'}/v1/accounts:lookup?key=${key}`
};
