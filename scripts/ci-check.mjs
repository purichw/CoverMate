import { spawn } from "node:child_process";

import { startStaticServer } from "./lib/static-server.mjs";

const commands = [
  ["node", ["scripts/build-vendor.mjs"]],
  ["npm", ["run", "build:telemetry"]],
  ["npm", ["run", "build:media"]],
  ["npm", ["run", "check:types"]],
  ["npm", ["run", "check:nfr"]],
  ["npm", ["run", "check:public-request"]],
  ["npm", ["run", "build:visitor"]],
  ["npm", ["run", "build:errors"]],
  ["npm", ["run", "check:errors"]],
  ["npm", ["run", "check:editor-history"]],
  ["npm", ["run", "check:admin-home"]],
  ["npm", ["run", "check:bundles"]],
  ["npm", ["run", "check:seo"]],
  ["npm", ["run", "check:contracts"]],
  ["npm", ["run", "check:security"]],
  ["npm", ["run", "check:ids"]],
  ["npm", ["run", "check:uat"]],
  ["npm", ["run", "check:needs"]],
  ["npm", ["run", "check:needs-v2"]],
  ["npm", ["run", "check:needs-contract"]],
  ["node", ["scripts/release-needs-content.mjs", "--test"]],
  ["npm", ["run", "check:contact"]],
  ["npm", ["run", "check:advisor"]],
  ["npm", ["run", "check:admin-structure"]],
  ["npm", ["run", "check:motor-design", "--", "--contract-only"]],
  ["npm", ["run", "check:text-editor"]],
  ["npm", ["run", "check:boot"]],
  ["npm", ["run", "check:loading"]],
  ["node", ["scripts/server-boot-check.mjs"]],
  ["npm", ["run", "check:live-content"]],
  ["npm", ["run", "check:analytics"]],
  ["npm", ["run", "check:consent"]],
  ["npm", ["run", "check:analytics-api"]],
  ["npm", ["run", "check:phase6"]],
  ["npm", ["run", "check:cms"]],
  ["npm", ["run", "check:cms:site"]],
  ["npm", ["run", "check:media"]],
  ["npm", ["run", "check:media:inline"]],
  ["npm", ["run", "check:ops"]],
  ["npm", ["run", "check:performance"]],
  ["git", ["diff", "--check"]]
];

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${[command, ...args].join(" ")}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

for (const [command, args] of commands) {
  await run(command, args);
}

const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
try {
  await run("npm", ["run", "smoke:admin-builder"], { COVERMATE_URL: baseUrl });
  await run("npm", ["run", "smoke"], { COVERMATE_URL: baseUrl });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("\nCoverMate CI gate passed");
