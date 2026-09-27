import { cleanText, cleanLeadChoice } from './covermate-contract.js';
import { validContactEmail } from './covermate-submission.mjs';

// Loaded only when preparing an enquiry, not while hydrating published content.
export async function prepareContactPayload(input = {}) {
  if (String(input.topic || '').length > 500) throw new Error('Please keep your message within 500 characters.');
  if (String(input.email || '').trim() && !validContactEmail(input.email)) throw Object.assign(new Error('Invalid email.'), { outcome: 'invalid', fields: { email: 'emailInvalid' } });
  const noticeDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(input.noticeText || '')));
  const noticeVersion = 'contact-' + [...new Uint8Array(noticeDigest)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
  const payload = {
    name: cleanText(input.name, 120), contact: cleanText(input.contact, 160),
    topic: cleanText(input.topic, 2000), summary: cleanText(input.summary, 1200),
    qtype: cleanLeadChoice(input.qtype, new Set(['', 'quote', 'assess', 'review', 'renewal', 'service', 'claim', 'general', 'compare'])),
    coverage: cleanLeadChoice(input.coverage, new Set(['', 'life', 'health', 'motor', 'accident', 'savings', 'unsure'])),
    language: input.language === 'en' ? 'en' : 'th', consent: input.consent === true,
    noticeVersion, consentKind: input.consentKind === 'renewal' ? 'renewal' : 'consultation',
    sourcePath: new URL(input.sourcePath || location.pathname, location.origin).pathname
  };
  if (String(input.email || '').trim()) payload.email = input.email.trim();
  if (input.calculator) {
    const { sanitizeNeedsSnapshot } = await import('./covermate-calculator.mjs');
    payload.calculator = sanitizeNeedsSnapshot(input.calculator);
  }
  return Object.freeze({ body: JSON.stringify(payload), key: crypto.randomUUID() });
}
