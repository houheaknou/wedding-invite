// Vercel build (`npm run vercel-build`, which Vercel prefers over `build`):
//   1. apply pending prisma/migrations to the database, then
//   2. build the app.
// Migrations use Neon's direct (non-pooled) connection: Prisma Migrate takes advisory locks, which
// a transaction-mode pooler can't hold. The Neon–Vercel integration provides DATABASE_URL_UNPOOLED.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!direct) {
  console.error("vercel-build: no database URL (DATABASE_URL / DATABASE_URL_UNPOOLED) is set");
  process.exit(1);
}

function run(bin, args, env = process.env) {
  const r = spawnSync(process.execPath, [require.resolve(bin), ...args], { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("prisma/build/index.js", ["migrate", "deploy"], { ...process.env, DATABASE_URL: direct });
run("next/dist/bin/next", ["build"]);
