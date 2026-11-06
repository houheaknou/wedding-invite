import { vi } from "vitest";
import { currentRequest } from "./next-mocks";
import { testDatabaseUrl } from "./test-db-url";

// Before any test file imports "@/lib/db": the Prisma client connects to the test database only.
process.env.DATABASE_URL = testDatabaseUrl();

// Next.js request APIs → the fake request in next-mocks.ts
vi.mock("next/headers", () => ({
  headers: () => currentRequest().headers(),
  cookies: () => currentRequest().cookies(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
