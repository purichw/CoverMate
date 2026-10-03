import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { classifyCi } from './lib/ci-policy.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const result = await classifyCi({
  eventName: process.env.GITHUB_EVENT_NAME,
  event,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  git: args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
  api: async path => {
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    return response.json();
  }
});
console.log(`${result.mode}: ${result.reason}`);
appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\nbase=${result.base}\nbaseline_run=${result.baselineRun}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `CI path: **${result.mode}**. ${result.reason}\n`);
