// Production build for testers, side by side with the dev server [review H-3].
//   npm run testers:build   — build into .next-prod (the dev server keeps .next)
//   npm run testers:start   — serve it on port 3000 (the tunnel's target); dev runs on 3001
// Uses the same .env, database and uploads folder as the dev server. Rebuild after code changes.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const cmd = process.argv[2];
if (cmd !== "build" && cmd !== "start") {
  console.error("usage: node scripts/testers.mjs build|start");
  process.exit(1);
}
const args = cmd === "start" ? ["start", "-p", process.env.TESTERS_PORT || "3000"] : ["build"];
// Run Next's own CLI with this Node directly: no shell, so no argument-escaping concerns (DEP0190)
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: ".next-prod" },
});
child.on("exit", (code) => process.exit(code ?? 1));
