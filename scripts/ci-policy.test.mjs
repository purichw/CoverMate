import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDocsOnly, classifyCi, hasPassingBaseline, verifyCiNeeds } from './lib/ci-policy.mjs';
import { buildCommands, checkGroups, commandsForSuite, browserSuites, fullSuiteJobNames } from './lib/ci-plan.mjs';
import { runCi } from './ci-check.mjs';
import { checkDocs } from './ci-docs-check.mjs';

const base = 'a'.repeat(40), head = 'b'.repeat(40);
const legacyJobs = [{ name: 'verify', conclusion: 'success', steps: [
  { name: 'Run CoverMate gate', conclusion: 'success' },
  { name: 'Real Auth, Rules, API and Publish E2E', conclusion: 'success' }
] }];
const passingRun = { id: 123, head_sha: base, head_branch: 'main', status: 'completed', conclusion: 'success', event: 'push', run_number: 1, run_attempt: 1, html_url: 'https://github.com/example/repo/actions/runs/123' };
const fullJobs = ['scope', 'verify', ...fullSuiteJobNames].map(name => ({ name, conclusion: 'success' }));
function scopeInput({ paths = ['docs/HANDOFF.md'], runs = [passingRun], jobs = legacyJobs, eventName = 'push', event = { before: base }, unavailable = false, incompleteJobs = false } = {}) {
  return { eventName, event, head,
    git: args => args[0] === 'diff' ? paths.join('\0') + '\0' : '',
    api: async path => {
      if (unavailable) throw new Error('API unavailable');
      return path.includes('/jobs?') ? { jobs, total_count: jobs.length + Number(incompleteJobs) } : { workflow_runs: runs };
    }
  };
}

test('only allowlisted documentation qualifies; mixed changes, assets and unknown paths require tests', () => {
  assert.ok(isDocsOnly(['README.md', 'PROJECT_MAP.md', 'docs/nested/guide.md', 'skills/tool/SKILL.md']));
  for (const paths of [[], ['docs/figure.png'], ['docs/data.json'], ['src/public/README.md'], ['.github/workflows/ci.yml'], ['package.json'], ['skills/tool/run.js'], ['docs/a.md', 'src/a.js'], ['docs/../src/a.md']]) assert.equal(isDocsOnly(paths), false);
});

test('docs push reuses the exact green base and records its run identity', async () => {
  const result = await classifyCi(scopeInput());
  assert.equal(result.mode, 'docs');
  assert.equal(result.base, base);
  assert.equal(result.baselineRun, '123');
});

test('docs PR checks the tested merge tree against its current base', async () => {
  const input = scopeInput({ eventName: 'pull_request', event: { pull_request: { base: { sha: base } } } });
  let diff;
  input.git = args => { if (args[0] === 'diff') { diff = args; return 'README.md\0'; } return ''; };
  assert.equal((await classifyCi(input)).mode, 'docs');
  assert.deepEqual(diff.slice(-2), [base, head]);
});

test('unknown/runtime paths and manual runs never call the shortcut API', async () => {
  for (const config of [{ paths: ['src/app.js'] }, { eventName: 'workflow_dispatch' }, { eventName: 'unknown' }, { event: { before: '0'.repeat(40) } }]) {
    const input = scopeInput(config);
    input.api = () => assert.fail('must not request baseline for a full run');
    assert.equal((await classifyCi(input)).mode, 'full');
  }
});

test('missing history, API denial or incomplete coverage falls back to full CI', async () => {
  for (const config of [{ runs: [] }, { unavailable: true }, { incompleteJobs: true }]) assert.equal((await classifyCi(scopeInput(config))).mode, 'full');
  const input = scopeInput();
  input.git = () => { throw new Error('base unavailable or not an ancestor'); };
  assert.equal((await classifyCi(input)).mode, 'full');
});

test('green checks on another SHA or branch cannot bless changed runtime', async () => {
  for (const delta of [{ head_sha: head }, { head_branch: 'feature' }]) {
    assert.equal((await classifyCi(scopeInput({ runs: [{ ...passingRun, ...delta }] }))).mode, 'full');
  }
});

test('latest base attempt must pass; failures, cancellations and pending checks never qualify', async () => {
  for (const delta of [{ conclusion: 'failure' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }, { status: 'in_progress', conclusion: null }]) {
    assert.equal((await classifyCi(scopeInput({ runs: [passingRun, { ...passingRun, run_number: 2, ...delta }] }))).mode, 'full');
  }
});

test('legacy green job requires both actual main and emulator steps', async () => {
  assert.ok(hasPassingBaseline(passingRun, legacyJobs));
  for (const conclusion of ['skipped', 'failure', 'cancelled']) {
    const jobs = structuredClone(legacyJobs);
    jobs[0].steps[1].conclusion = conclusion;
    assert.equal(hasPassingBaseline(passingRun, jobs), false);
  }
});

test('split baseline requires every shard; docs chain requires intentionally skipped runtime jobs', () => {
  assert.ok(hasPassingBaseline(passingRun, fullJobs));
  for (const name of fullSuiteJobNames) {
    assert.equal(hasPassingBaseline(passingRun, fullJobs.filter(job => job.name !== name)), false);
    assert.equal(hasPassingBaseline(passingRun, fullJobs.map(job => job.name === name ? { ...job, conclusion: 'failure' } : job)), false);
  }
  const docsJobs = ['scope', 'verify', 'docs'].map(name => ({ name, conclusion: 'success' })).concat(['preflight', 'browser', 'emulators'].map(name => ({ name, conclusion: 'skipped' })));
  assert.ok(hasPassingBaseline(passingRun, docsJobs));
  assert.equal(hasPassingBaseline(passingRun, docsJobs.filter(job => job.name !== 'emulators')), false);
});

function needs(mode) {
  return {
    scope: { result: 'success', outputs: { mode, base, baseline_run: '123' } },
    docs: { result: mode === 'docs' ? 'success' : 'skipped' },
    ...Object.fromEntries(['preflight', 'browser', 'emulators'].map(name => [name, { result: mode === 'full' ? 'success' : 'skipped' }]))
  };
}

test('final verify passes only the complete selected path', () => {
  assert.equal(verifyCiNeeds(needs('full')), 'full');
  assert.equal(verifyCiNeeds(needs('docs')), 'docs');
  assert.throws(() => verifyCiNeeds(needs('unknown')));
  const noBaseline = needs('docs');
  delete noBaseline.scope.outputs.baseline_run;
  assert.throws(() => verifyCiNeeds(noBaseline));
});

test('final verify fails closed for every required failed, cancelled, skipped or missing result', () => {
  for (const mode of ['full', 'docs']) {
    for (const name of mode === 'full' ? ['scope', 'preflight', 'browser', 'emulators'] : ['scope', 'docs']) {
      for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
        const input = needs(mode);
        input[name].result = result;
        assert.throws(() => verifyCiNeeds(input), `${mode} / ${name} / ${result}`);
      }
    }
  }
  const accidentalSkip = needs('full');
  accidentalSkip.browser.result = 'skipped';
  assert.throws(() => verifyCiNeeds(accidentalSkip));
  const unexpectedRuntime = needs('docs');
  unexpectedRuntime.preflight.result = 'failure';
  assert.throws(() => verifyCiNeeds(unexpectedRuntime));
});

test('suite partition has no lost/duplicate commands; every suite builds its isolated checkout', () => {
  const all = commandsForSuite();
  assert.equal(new Set(all.map(JSON.stringify)).size, all.length);
  assert.deepEqual(all, [...buildCommands, ...Object.values(checkGroups).flat()]);
  for (const name of ['preflight', ...browserSuites, 'emulators']) assert.deepEqual(commandsForSuite(name).slice(0, buildCommands.length), buildCommands);
  assert.deepEqual(commandsForSuite('emulators').at(-1), ['npm', ['run', 'check:emulators']]);
  assert.equal(all.some(command => command[1].includes('check:emulators')), false, 'local check:ci retains its original separate-emulator contract');
  assert.deepEqual(checkGroups.preflight[0], ['npm', ['run', 'check:performance']]);
  assert.throws(() => commandsForSuite('typo'));
});

test('an early budget failure stops before any expensive browser suite', async () => {
  const calls = [];
  await assert.rejects(runCi('all', {
    execute: async (command, args) => {
      calls.push([command, args]);
      if (args.includes('check:performance')) throw new Error('over budget');
    },
    startServer: () => assert.fail('must not reach smoke')
  }), /over budget/);
  assert.deepEqual(calls, [...buildCommands, checkGroups.preflight[0]]);
});

test('full local runner executes the entire inventory and shares/cleans up the smoke server', async () => {
  const calls = []; let starts = 0, closes = 0;
  await runCi('all', {
    execute: async (command, args, env) => calls.push({ command: [command, args], env }),
    startServer: async () => { starts++; return { baseUrl: 'http://127.0.0.1:1234', server: { close: done => { closes++; done(); } } }; }
  });
  assert.deepEqual(calls.map(call => call.command), commandsForSuite('all'));
  assert.deepEqual(calls.at(-1).env, { COVERMATE_URL: 'http://127.0.0.1:1234' });
  assert.equal(starts, 1); assert.equal(closes, 1);
});

test('smoke failure closes its server and unknown suite runs nothing', async () => {
  let closed = false;
  await assert.rejects(runCi('smoke', {
    execute: async (_command, args) => { if (args.includes('smoke:admin-builder')) throw new Error('smoke failed'); },
    startServer: async () => ({ baseUrl: 'http://test', server: { close: done => { closed = true; done(); } } })
  }), /smoke failed/);
  assert.ok(closed);
  await assert.rejects(runCi('typo', { execute: () => assert.fail('must not execute') }), /Unknown CI suite/);
});

test('docs check validates relative links, supports deleted docs and rejects a mixed runtime diff', () => {
  const input = {
    git: args => args.includes('--name-only') ? 'docs/HANDOFF.md\0docs/deleted.md\0' : '',
    read: () => '[good](../README.md#intro) [remote](https://example.com) [local](/Users/example/evidence.png)\n```\n[example](missing.md)\n```',
    exists: file => file !== 'docs/deleted.md' && !file.endsWith('missing.md')
  };
  assert.deepEqual(checkDocs(base, input), { files: 2, links: 1 });
  assert.throws(() => checkDocs(base, { ...input, read: () => '[bad](missing.md)' }), /missing relative link/);
  assert.throws(() => checkDocs(base, { ...input, git: () => 'README.md\0src/app.js\0' }), /only allowlisted Markdown/);
  assert.throws(() => checkDocs(base, { ...input, git: args => {
    if (args.includes('--check')) throw new Error('trailing whitespace');
    return 'README.md\0';
  } }), /trailing whitespace/);
});
