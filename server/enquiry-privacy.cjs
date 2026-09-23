const { createHash } = require('node:crypto');
const { error } = require('./http.cjs');
const versionFor = text => `contact-${createHash('sha256').update(text).digest('hex').slice(0, 24)}`;
async function verifyReceipt(db, env, input, id, now) {
  const { CMS_CONTENT_FIELDS } = await import('../covermate-contract.js');
  const path = input.consentKind === 'renewal' ? 'publicCopy.renewalConsent' : 'ui.consultationConsent';
  const lang = input.language === 'en' ? 'en' : 'th';
  const live = (await db.doc(`sites/${env.siteId}/states/live`).get()).data();
  const key = path.split('.')[1];
  const seeded = CMS_CONTENT_FIELDS.find(field => field.path === path)?.seed;
  const localized = live?.config?.[path.split('.')[0]]?.[key] || seeded;
  const noticeText = typeof localized === 'string' ? localized : localized?.[lang] || localized?.th;
  if (!noticeText || input.noticeVersion !== versionFor(noticeText)) throw error(409, 'consent_changed', 'The privacy notice changed. Reload, review it and confirm again.');
  return { id: `receipt-${id}`, noticeVersion: versionFor(noticeText), noticeText, accepted: true, acceptedAt: now };
}
module.exports = { verifyReceipt, versionFor };
