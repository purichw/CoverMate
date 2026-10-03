import { fullSuiteJobNames } from './ci-plan.mjs';

// An allowlist, not a runtime denylist. Assets, scripts, config and unknown
// paths always take the full path, including Markdown outside these locations.
export function isDocumentationPath(path) {
  if (path.split('/').some(part => part === '.' || part === '..')) return false;
  return ['README.md', 'PROJECT_MAP.md'].includes(path)
    || /^(docs|skills)\/.+\.md$/.test(path);
}

export function isDocsOnly(paths) {
  return paths.length > 0 && paths.every(isDocumentationPath);
}

export function hasPassingBaseline(run, jobs) {
  if (run.status !== 'completed' || run.conclusion !== 'success' || run.event !== 'push') return false;
  const passed = name => jobs.filter(job => job.name === name).length === 1
    && jobs.find(job => job.name === name).conclusion === 'success';
  if (!passed('verify')) return false;
  // Compatibility with the original single-job workflow. Both real steps must
  // have executed, not merely a workflow with a green/skipped check.
  const verify = jobs.find(job => job.name === 'verify');
  if (['Run CoverMate gate', 'Real Auth, Rules, API and Publish E2E'].every(name =>
    verify.steps?.some(step => step.name === name && step.conclusion === 'success'))) return true;
  if (passed('scope') && fullSuiteJobNames.every(passed)) return true;
  // Consecutive docs pushes may reuse a verified docs baseline. This workflow's
  // verify gate requires its own passing baseline; workflow/script changes are
  // excluded from the documentation allowlist, so they cannot enter this path.
  const browserJobs = jobs.filter(job => job.name === 'browser' || job.name.startsWith('browser ('));
  return passed('scope') && passed('docs') && browserJobs.length > 0
    && browserJobs.every(job => job.conclusion === 'skipped')
    && ['preflight', 'emulators'].every(name => jobs.find(job => job.name === name)?.conclusion === 'skipped');
}

export async function classifyCi({ eventName, event, head, git, api }) {
  const full = reason => ({ mode: 'full', base: '', baselineRun: '', reason });
  if (!['push', 'pull_request'].includes(eventName)) return full('Manual or unknown event: full coverage required.');
  const base = eventName === 'push' ? event.before : event.pull_request?.base?.sha;
  if (!/^[a-f0-9]{40}$/.test(base || '') || /^0+$/.test(base)) return full('No usable base revision.');
  try {
    git(['merge-base', '--is-ancestor', base, head]);
    const paths = git(['diff', '--no-renames', '--name-only', '-z', base, head]).split('\0').filter(Boolean);
    if (!isDocsOnly(paths)) return full('Runtime, config, test or unknown paths changed.');
    // Query the exact base SHA, not the latest green check on another revision.
    const { workflow_runs: runs } = await api(`/actions/workflows/ci.yml/runs?head_sha=${base}&event=push&per_page=20`);
    const run = runs.filter(item => item.head_sha === base && item.head_branch === 'main')
      .sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt)[0];
    if (!run || run.status !== 'completed' || run.conclusion !== 'success') return full('Exact base revision has no successful completed CI.');
    const { jobs, total_count: count } = await api(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
    if (jobs.length !== count || !hasPassingBaseline(run, jobs)) return full('Base coverage could not be verified.');
    return { mode: 'docs', base, baselineRun: String(run.id), reason: `Documentation only; unchanged runtime covered by ${run.html_url}.` };
  } catch {
    // Missing permissions, unavailable history/API and incomplete evidence must
    // run the tests, never turn into a green documentation shortcut.
    return full('Baseline lookup unavailable: full coverage required.');
  }
}

export function verifyCiNeeds(needs) {
  const requireResult = (name, result) => {
    if (needs[name]?.result !== result) throw new Error(`${name}: expected ${result}, got ${needs[name]?.result || 'missing'}`);
  };
  requireResult('scope', 'success');
  const { mode, base, baseline_run: baselineRun } = needs.scope.outputs || {};
  if (mode === 'docs') {
    if (!/^[a-f0-9]{40}$/.test(base || '') || !/^\d+$/.test(baselineRun || '')) throw new Error('Missing docs baseline evidence.');
    requireResult('docs', 'success');
    for (const name of ['preflight', 'browser', 'emulators']) requireResult(name, 'skipped');
  } else if (mode === 'full') {
    requireResult('docs', 'skipped');
    for (const name of ['preflight', 'browser', 'emulators']) requireResult(name, 'success');
  } else throw new Error(`Unknown CI mode: ${mode}`);
  return mode;
}
