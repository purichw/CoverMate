import fs from 'node:fs';
const file = new URL('../vercel.json', import.meta.url);
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const headers = config.headers.find(entry => entry.source === '/(.*)').headers;
const policy = [
  "default-src 'self'",
  "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
  "form-action 'self'", "img-src 'self' data: blob: https:",
  "font-src 'self' data: blob: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // The exported DC renderer compiles its template expressions at runtime.
  // Keep that explicit exception until it has a build-time compiler.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.gstatic.com https://apis.google.com https://www.googletagmanager.com https://www.google.com https://www.recaptcha.net",
  "frame-src https://covermate-purich.firebaseapp.com https://www.google.com https://www.recaptcha.net",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://firebaseinstallations.googleapis.com https://firebaseappcheck.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com https://www.recaptcha.net",
  "report-uri /api/telemetry"
].join('; ');
for (const key of ['Content-Security-Policy', 'Content-Security-Policy-Report-Only', 'X-Frame-Options']) {
  const index = headers.findIndex(header => header.key === key);
  if (index >= 0) headers.splice(index, 1);
}
headers.push({ key: 'Content-Security-Policy', value: policy }, { key: 'X-Frame-Options', value: 'DENY' });
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
