import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Two projects:
 *   unit — pure logic, never touches a database (npm test)
 *   db   — against the throwaway Postgres from docker-compose.test.yml (npm run test:db)
 * See tests/README.md.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      // "server-only" throws outside a React Server Components bundle
      "server-only": r("./tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    // The db tests share one database and empty it between tests, so files must not run at the
    // same time. (Only honoured at the root, not per project; the unit suite is fast either way.)
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], setupFiles: ["tests/support/no-db.ts"] },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/support/db-global.ts"],
          setupFiles: ["tests/support/db-env.ts"],
        },
      },
    ],
  },
});
