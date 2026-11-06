// Unit tests must never reach a real database. Prisma reads .env (the dev database) when
// DATABASE_URL is unset, so point it at a port where nothing listens.
process.env.DATABASE_URL = "postgresql://unit-tests@127.0.0.1:1/no_database";
