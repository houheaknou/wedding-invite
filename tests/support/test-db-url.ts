/**
 * The database the db tests may wipe. Defaults to the throwaway container in docker-compose.test.yml.
 * Refuses anything that does not look like a test database, so a typo can never point the
 * TRUNCATEs at real data.
 */
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://wedding_test:wedding_test@127.0.0.1:5435/wedding_invite_test?schema=public";
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`TEST_DATABASE_URL must name a database ending in "_test" (got "${name}")`);
  }
  return url;
}
