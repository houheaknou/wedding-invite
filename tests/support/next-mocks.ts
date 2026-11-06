/**
 * Fake Next.js request for server-action tests: request headers and a cookie jar. The modules
 * next/headers, next/navigation and next/cache are mocked in db-env.ts (a setup file) and read the
 * current fake from here. Call `newRequest()` to start a fresh "browser" (e.g. another IP).
 */
type FakeRequest = ReturnType<typeof fakeRequest>;

function fakeRequest() {
  const jar = new Map<string, string>();
  const hdrs = new Map<string, string>();
  return {
    jar,
    hdrs,
    headers: async () => ({ get: (k: string) => hdrs.get(k.toLowerCase()) ?? null }),
    cookies: async () => ({
      get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k),
    }),
  };
}

const state = globalThis as unknown as { __fakeRequest?: FakeRequest };

export const currentRequest = () => (state.__fakeRequest ??= newRequest());

export function newRequest(ip = "203.0.113.7") {
  const req = fakeRequest();
  req.hdrs.set("x-forwarded-for", ip);
  state.__fakeRequest = req;
  return req;
}
