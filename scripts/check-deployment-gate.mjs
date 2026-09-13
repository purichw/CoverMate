import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const expected = JSON.parse(fs.readFileSync(new URL('../.github/vercel-production-check.json', import.meta.url), 'utf8'));
const scope = 'purichwc-1517s-projects';
const read = args => JSON.parse(execFileSync('vercel', args.concat(['--scope', scope]), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const project = read(['api', '/v9/projects/prj_AraOMyb7pLZrYhcxu70cpRhqfH1F', '--raw']);
const { checks } = read(['project', 'checks', 'covermate', '--format', 'json']);
assert.equal(project.link?.type, 'github');
assert.equal(project.link?.org, 'purichw');
assert.equal(project.link?.repo, 'CoverMate');
assert.equal(project.link?.productionBranch, 'main');
assert.equal(project.autoAssignCustomDomains, true);
const check = checks.find(item => item.source?.externalCheckName === expected.source.externalCheckName);
assert.ok(check, 'Production CI check is missing');
for (const [key, value] of Object.entries(expected)) assert.deepEqual(check[key], value, 'Deployment gate drift: ' + key);
console.log('PASS live Vercel production gate: GitHub verify, production-only, alias blocked, timeout 3600s');
console.log('Check: ' + check.id + '. Read-only configuration check; not a deployment or an end-to-end promotion test.');
