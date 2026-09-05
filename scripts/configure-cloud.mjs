import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';

const project = 'covermate-purich';
const number = '7468452473';
const forms = `covermate-forms@${project}.iam.gserviceaccount.com`;
const backup = `covermate-backup@${project}.iam.gserviceaccount.com`;
const run = (command, args, input) => {
  const result = spawnSync(command, args, { input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
};
if (!process.argv.includes('--apply')) throw new Error('Use --apply for the requested cloud setup.');
for (const [account, role] of [[forms, 'roles/datastore.user'], [backup, 'roles/datastore.viewer']]) {
  run('gcloud', ['projects', 'add-iam-policy-binding', project, `--member=serviceAccount:${account}`, `--role=${role}`, '--condition=None', '--quiet', '--format=none']);
}
const credentialPath = '.tools/forms-credentials.json';
if (!fs.existsSync(credentialPath)) run('gcloud', ['iam', 'service-accounts', 'keys', 'create', credentialPath, `--iam-account=${forms}`, `--project=${project}`, '--quiet']);
const credentials = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
const file = '.env.server.local';
if (!fs.existsSync(file)) fs.writeFileSync(file, [
  `COVERMATE_SERVER_CREDENTIALS=${JSON.stringify(credentials)}`,
  `COVERMATE_RATE_LIMIT_SECRET=${randomBytes(32).toString('hex')}`,
  'COVERMATE_RECAPTCHA_SITE_KEY=6LdwTaotAAAAAFW975ISQ8u0OGENEH1h4FPSftps',
  `COVERMATE_BACKUP_KEY=${randomBytes(32).toString('base64')}`,
  'COVERMATE_BACKUP_USE_GCLOUD=1', ''
].join('\n'), { mode: 0o600, flag: 'wx' });
const accessToken = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const app = encodeURIComponent('1:7468452473:web:52b47eef5362d4029fe2a8');
const name = `projects/${number}/apps/${app}/recaptchaEnterpriseConfig`;
const response = await fetch(`https://firebaseappcheck.googleapis.com/v1/${name}?updateMask=siteKey,tokenTtl`, {
  method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'x-goog-user-project': project },
  body: JSON.stringify({ siteKey: '6LdwTaotAAAAAFW975ISQ8u0OGENEH1h4FPSftps', tokenTtl: '3600s' })
});
if (!response.ok) throw new Error(`App Check registration failed (${response.status}): ${(await response.json()).error?.message}`);
console.log('Configured scoped service accounts and App Check. Credentials stay in ignored local files. Billing unchanged.');
