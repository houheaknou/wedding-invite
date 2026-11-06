# Tests

Vitest, two suites:

| Suite | Command | Needs |
|---|---|---|
| **unit**: parsers, money, dates, upload sniffing, Telegram signatures, map links | `npm test` | nothing; never touches a database |
| **db**: rate limiter, Google/Telegram linking, ownership checks, login limits, public RSVP | `npm run test:db` | the throwaway test database |

```bash
docker compose -f docker-compose.test.yml up -d --wait   # Postgres on 127.0.0.1:5435, data in memory
npm run test:db                                          # applies migrations, then runs the suite
docker compose -f docker-compose.test.yml down           # throws the data away
```

## Safety

- The db suite **empties every table between tests**. It only connects to `TEST_DATABASE_URL`
  (default: the container above) and refuses any database whose name doesn't end in `_test`.
  It never uses `DATABASE_URL` from `.env`.
- The unit suite points Prisma at a closed port, so an accidental query fails instead of
  reaching the dev database.

## Writing tests

- Server actions run for real; `next/headers`, `next/navigation` and `next/cache` are replaced in
  `support/db-env.ts`. `redirect()` throws `REDIRECT <url>` and `notFound()` throws `NOT_FOUND`.
  `newRequest(ip)` from `support/next-mocks.ts` starts a fresh browser (new cookie jar, new IP).
- Sign in through the real `login` action (see `db/actions.test.ts`), not by inserting sessions.
- Name the review finding a test guards (`[review S-1]`) so it's clear why it exists.
