import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { commandsForSuite } from "./lib/ci-plan.mjs";

export function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const label = [command, ...args].join(" ");
    const started = performance.now();
    console.log(`\n$ ${label}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      console.log(`CI timing: ${seconds}s | ${label} | exit ${code}`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${seconds}s — \`${label}\` — exit ${code}\n`);
      }
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with ${code}`));
    });
  });
}

export async function runCi(suite = "all", {
  execute = runCommand,
  startServer = async () => {
    const { startStaticServer } = await import("./lib/static-server.mjs");
    return startStaticServer({ ownerRoutesToRoot: true });
  }
} = {}) {
  const commands = commandsForSuite(suite); // Validate before any side effects.
  let server, baseUrl;
  try {
    for (const [command, args] of commands) {
      const smoke = args[0] === "run" && ["smoke", "smoke:admin-builder"].includes(args[1]);
      if (smoke && !server) ({ server, baseUrl } = await startServer());
      await execute(command, args, smoke ? { COVERMATE_URL: baseUrl } : {});
    }
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  console.log(`\nCoverMate CI ${suite} passed`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--suite")) {
    throw new Error("Usage: node scripts/ci-check.mjs [--suite all|build|preflight|visitor|articles|cms|admin|smoke|emulators]");
  }
  await runCi(args[1] || "all");
}
