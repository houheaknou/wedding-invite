import { prisma } from "@/lib/db";

/** Empty every table of the test database (guarded by test-db-url.ts / db-env.ts). */
export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("refusing to reset a non-test database");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
}
