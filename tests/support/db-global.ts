import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./test-db-url";

/** Once per run: bring the test database's schema up to date. */
export default function setup() {
  const url = testDatabaseUrl();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
