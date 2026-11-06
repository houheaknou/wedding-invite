# Code review & refactoring plan — wedding-invite (2026-11-06)

Scope: the whole `wedding-invite` repository as it stands in the working tree (all work since
`035e54f Initial commit from Create Next App` is **uncommitted**). Analysis only — **no code was
changed for this review**. Nothing below has been run against production (there is none yet).

---

## 1. Architecture overview

| Area | What is there |
|---|---|
| Framework | Next.js **15.5.28**, **App Router**, React 19.1, TypeScript `strict` (≈12.3k lines in `src/`) |
| Styling | Tailwind CSS 4 + CSS modules for the 4 invitation templates |
| Data | PostgreSQL 16 (Docker) via **Prisma 6.19**; 21 hand-written migrations in `prisma/migrations` |
| Auth | Own implementation (`src/lib/auth.ts`): random 32-byte session token in an httpOnly cookie, SHA-256 hash stored in `Session`; bcrypt (cost 10) passwords; Google OAuth code flow and Telegram Login (`src/lib/social-auth.ts`) |
| Authorization | Per-request: `requireUser()` / `requireOwnedEvent()` in layouts, pages, server actions and API routes. No middleware. |
| Mutations | Server Actions in `src/actions/*` (auth, account, events, guests, expenses, gifts, gallery, invitation, rsvp) |
| Reads | Server Components with Prisma; API routes only for binary/streamed data (photos, gallery, cover, music, exports) and OAuth callbacks |
| Files | Images in Postgres `bytea` (`Event.coverImage`, `EventPhoto`, `GalleryPhoto`); music on local disk `uploads/music` |
| Public surface | `/i/[shareId]` and `/i/[shareId]/[guestId]` invitations, `/api/invite/*` media, public RSVP action |
| i18n | One `src/lib/i18n.ts` (866 lines, km + en), language in a cookie |
| Docker | `docker-compose.yml` runs **only Postgres**; the app has no Dockerfile |
| Tests | **None** |
| Integrations | Google OAuth, Telegram Login widget, Google Maps (server resolves share links), Cloudflare quick tunnel (dev testing) |

Strengths worth keeping: consistent ownership checks in every action and route (verified one by
one), ids from the client always re-scoped to the owned event, hashed session tokens, httpOnly +
SameSite cookies, `Secure` in production, sessions revoked on password change, Telegram hash
verified with `timingSafeEqual`, Google `state` check and `email_verified`, music filenames
generated server-side with path checks, Prisma everywhere (no string-built SQL), money as
`Decimal`, image columns excluded from page queries with `omit`.

---

## 2. Executed checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint .` | ✅ 0 problems |
| `docker compose config --quiet` | ✅ valid |
| `npm audit --omit=dev` | ⚠️ 7 advisories (3 moderate, 4 high) — see S-9 |
| `npx next build` | ❌ **fails** — see C-1 |
| Unit / integration tests | ⛔ none exist |
| `EXPLAIN (ANALYZE, BUFFERS)` | not run (no staging/production DB; data is tiny) |

---

## 3. Findings by severity

### Critical

#### C-1 · Production build fails (deployment blocker)
- **File:** `src/lib/invite-fonts.ts:6`
- **Category:** Docker / Deployment
- **Problem:** `npx next build` stops with `An error occurred in next/font … Cannot read properties of null (reading '1')` for `Noto_Serif_Khmer`. Next's Google-font loader receives a font-file URL without a file extension for this family and crashes. `next dev` hides it (it falls back silently).
- **Impact:** The app cannot be built for production or containerised; everything currently runs on the dev server.
- **Recommendation:** Self-host this one font with `next/font/local` (it is OFL-licensed): download the two woff2 files (400, 600 Khmer subset) into `src/fonts/` and keep the same CSS variable, so no template CSS changes.
- **Refactored code:**
  ```ts
  import localFont from "next/font/local";
  export const notoSerifKhmer = localFont({
    src: [
      { path: "../fonts/NotoSerifKhmer-400.woff2", weight: "400" },
      { path: "../fonts/NotoSerifKhmer-600.woff2", weight: "600" },
    ],
    variable: "--font-km-serif",
    display: "swap",
  });
  ```
- **Testing:** `npx next build` succeeds; Lotus template countdown/programme still render in Noto Serif Khmer.

### High

#### S-1 · Account pre-hijacking through email linking
- **Files:** `src/lib/social-auth.ts:41-46`, `src/actions/auth.ts:19-36`, `src/actions/account.ts:18-40`
- **Category:** Security (OWASP A07 Identification & Authentication Failures)
- **Problem:** Sign-up and profile edits accept any email without proving ownership. Google sign-in then **auto-links to the existing account with that email**.
- **Impact:** An attacker registers `victim@gmail.com` with their own password before the victim ever uses the app. When the victim later signs in with Google, they land in the attacker's account, and the attacker keeps password access to everything the victim adds (guests, gifts, bank KHQR).
- **Recommendation:** Only auto-link when the existing account has **no password** (it was itself created by Google/Telegram). Otherwise refuse with "this email already has an account — log in with your password first", and link Google from *My account* while signed in. Email verification is the long-term fix. *Behaviour change — needs your approval.*
- **Refactored code:**
  ```ts
  const byEmail = await prisma.user.findUnique({ where: { email: p.email }, select: { id: true, passwordHash: true } });
  if (byEmail) {
    if (byEmail.passwordHash) throw new LinkRequiresLogin(); // callback → /login?error=link
    await prisma.user.update({ where: { id: byEmail.id }, data: { [key]: p.id } });
    return byEmail.id;
  }
  ```
- **Testing:** unit test for `userForSocial` (password account → refused; social-only account → linked; no account → created).

#### S-2 · No brute-force protection on login, sign-up or RSVP
- **Files:** `src/actions/auth.ts:38-50` (login), `:19` (register), `src/actions/rsvp.ts:18`
- **Category:** Security (OWASP A07)
- **Problem:** Unlimited password attempts per account/IP; unlimited account creation; unlimited public RSVP posts.
- **Impact:** Password guessing against known emails/phones; spam accounts; RSVP flooding (see M-4).
- **Recommendation:** A small Postgres-backed limiter (works across restarts and multiple containers): table `RateLimit(key, windowStart, count)`; e.g. login 5 failures / 15 min per `ip+login`, register 5 / hour per IP, RSVP 20 / hour per IP+invitation. No new library needed. *Adds a migration.*
- **Testing:** 6th wrong password within 15 min returns "too many attempts"; correct password after the window works.

#### H-3 · Dev server exposed to the internet with real data
- **Where:** the Cloudflare quick tunnel → `next dev` on :3000
- **Category:** Security / Deployment
- **Problem:** `next dev` is not hardened: verbose error overlays with stack traces and source, slower, no production optimisations; the tunnel URL is public.
- **Impact:** Information disclosure and an unstable public endpoint holding real personal data.
- **Recommendation:** After C-1, run testers against `next build && next start` (or the container from §5); stop the tunnel when not testing.
- **Testing:** an error on the public URL shows the generic error page, not a stack trace.

#### H-4 · Work is not under version control
- **Where:** repository — only the Create-Next-App commit exists; ~30 changed/added paths uncommitted
- **Category:** Process
- **Impact:** One accidental `git checkout`/disk problem loses everything; reviews and rollbacks are impossible.
- **Recommendation:** Commit the current state (after reviewing the diff), then make every step of this plan its own commit.

### Medium

#### M-1 · Database published on all interfaces with default credentials
- **File:** `docker-compose.yml:6-11`
- **Category:** Docker / Security
- **Problem:** `ports: "5434:5432"` binds `0.0.0.0` and `[::]` (confirmed with `docker port`); user/password `wedding`/`wedding` are hard-coded.
- **Impact:** Anyone on the same Wi-Fi/LAN can connect with the published password.
- **Recommendation:** `"127.0.0.1:5434:5432"` and credentials from `.env` (`${POSTGRES_PASSWORD}`); no published port in production (app reaches `db` on the compose network). *Changing the password means updating `DATABASE_URL` too — no data loss; volume untouched.*
- **Testing:** `docker port wedding-invite-db` shows `127.0.0.1:5434`; app still connects.

#### M-2 · No HTTP security headers
- **File:** `next.config.ts`
- **Category:** Security (OWASP A05)
- **Problem:** No `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, HSTS or CSP.
- **Impact:** Uploaded files can be MIME-sniffed; the app can be framed (click-jacking); full URLs (with share ids) leak in `Referer`.
- **Recommendation:** add `headers()` in `next.config.ts`:
  ```ts
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  ```
  (CSP later — the Telegram widget, Google Maps iframes and Google Fonts need an allow-list.)
- **Testing:** `curl -I` shows the headers; maps, Telegram and the builder preview still work.

#### M-3 · Uploads trust the browser-declared MIME type
- **Files:** `src/actions/invitation.ts:46-50`, `src/actions/gallery.ts`, `src/lib/media.ts:24-29` (music)
- **Category:** Security (OWASP A04/A08)
- **Problem:** `file.type` comes from the client; bytes are stored and served with that type.
- **Recommendation:** check magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF….WEBP`, MP3 `ID3`/frame sync, …) in one helper in `src/lib/photos.ts`, plus `nosniff` (M-2).
- **Testing:** an `.html` file renamed to `.png` is rejected with the existing "bad image" message.

#### M-4 · Public RSVP can create unlimited guests
- **File:** `src/actions/rsvp.ts:48`
- **Category:** Security / Data integrity
- **Problem:** Each anonymous RSVP on the general link creates a `Guest` row (honeypot only).
- **Impact:** A script can fill a couple's guest list with junk.
- **Recommendation:** rate limit (S-2) and a per-event cap of anonymous RSVP guests (e.g. 500).

#### M-5 · Spreadsheet imports parse untrusted files without limits
- **Files:** `src/lib/guest-io.ts:80` (`readRows`), `src/actions/guests.ts:76`, `src/actions/expenses.ts:71`, `src/actions/gifts.ts:85`
- **Category:** Security (DoS) / Performance
- **Problem:** Only the 12 MB request cap applies; a small `.xlsx` can decompress to hundreds of MB in ExcelJS.
- **Recommendation:** reject files > 2 MB before parsing and stop after 5,000 rows.
- **Testing:** a 3 MB file returns the "bad file" error quickly.

#### M-6 · Whole dictionary serialised into the client
- **Files:** 16 client components receive `t: Dict` (e.g. `AuthForm`, `GiftForm`, `ExpenseForm`, `ImportForm`, `TemplateEditor`)
- **Category:** Performance
- **Problem:** the full km+en dictionary object (≈430 keys) is embedded in the RSC payload of most pages (observed in the login page HTML).
- **Impact:** tens of KB of extra HTML/JS per page on mobile data.
- **Recommendation:** pass `pick(t, [...keys])` or small per-feature label objects; no behaviour change.
- **Testing:** page HTML size before/after; UI unchanged.

#### M-7 · Images live in Postgres and are streamed through Node
- **Files:** `prisma/schema.prisma` (`Event.coverImage`, `EventPhoto.data`, `GalleryPhoto.data`), `src/lib/photos.ts:14`
- **Category:** Performance / Database
- **Impact:** DB size and backup time grow with photos; every image hit uses a DB connection; no resizing (phones upload 3 MB photos that guests then download).
- **Recommendation (now):** downscale on upload in the browser (max 1600 px, WebP) — same pattern as the KHQR crop. **Later:** object storage with the DB keeping only keys.

#### M-8 · Guest export loads the cover image bytes
- **File:** `src/app/api/events/[id]/guests/export/route.ts:11`
- **Category:** Performance
- **Recommendation:** `select: { groomName: true, brideName: true }` like the gift/expense export routes.

#### M-9 · Dependency advisories
- **Source:** `npm audit --omit=dev`
- **Category:** Security (supply chain)
- **Problem:** `postcss` bundled in `next` (4 advisories: XSS in stringified CSS, source-map file read) and `uuid` < 11.1.1 via `exceljs` (buffer bounds).
- **Impact:** low in practice — PostCSS only processes the app's own CSS at build time; the vulnerable `uuid` buffer API isn't called.
- **Recommendation:** do **not** run `npm audit fix --force` (it jumps to Next 16 / downgrades ExcelJS). Take the next 15.5.x patch release when it ships; re-audit.

#### M-10 · No automated tests
- **Category:** Code quality
- **Recommendation:** see §6.

### Low

| Id | File | Category | Problem → Recommendation |
|---|---|---|---|
| L-1 | `package.json` | Code quality | `zod` installed but never imported → adopt it for action input validation (L-2) or remove it |
| L-2 | `src/actions/expenses.ts:14`, `src/actions/gifts.ts:17`, `src/lib/expense-io.ts:61`, `src/lib/gift-io.ts:43`, `str/opt` in every action file | Code quality (DRY) | Four copies of money/number parsing and repeated `str/opt` helpers → one `src/lib/parse.ts` with tests |
| L-3 | `src/components/TemplateEditor.tsx` (1,030 lines), `lotus/LotusInvitation.tsx` (1,114), `royal/RoyalInvitation.tsx` (824), `petal/PetalInvitation.tsx` (773) | Architecture | Very large client components → split by tab/section (e.g. `builder/GiftTab.tsx`) when next touched; no rewrite |
| L-4 | `src/lib/social-auth.ts:20-25` | Security | `appOrigin()` trusts `X-Forwarded-Host` when `NEXT_PUBLIC_APP_URL` is empty → always set it in production |
| L-5 | `src/lib/social-auth.ts` (`telegramProfile`) | Security | 24 h `auth_date` window allows login-CSRF replay of a signed Telegram link → 1 h |
| L-6 | `src/lib/auth.ts` | Database | Expired `Session` rows are never deleted → delete expired rows on login (cheap, indexed by `userId`) |
| L-7 | `src/lib/media.ts:12` | Docker | Music on local disk `uploads/` — lost on container rebuild unless volume-mounted (see §5) |
| L-8 | `prisma/schema.prisma` (`Gift.currency`, `Event.currency`) | Database | Free-text currency columns → `CHECK (currency IN ('USD','KHR'))` in a migration |

---

## 4. PostgreSQL recommendations

- **Schema & integrity:** good — FKs with `onDelete: Cascade`/`SetNull`, unique constraints on login identifiers, share id and `(eventId, kind)` photos; money as `Decimal(14,2)`. Add the currency CHECKs (L-8).
- **Indexes:** every `eventId` FK is indexed; `Session.userId` and `tokenHash` covered. Optional: `Rsvp(guestId)` (used by `SetNull` cascades). Guest search uses `ILIKE '%q%'` (seq scan) — fine at wedding scale (hundreds of rows); add `pg_trgm` GIN only if an event exceeds ~10k guests.
- **Queries:** no N+1 patterns found; pages use `Promise.all`; imports use `createMany` in a `$transaction`; guest list is paginated. Keep `omit: { coverImage: true }` discipline (M-8).
- **Pooling:** Prisma's default pool (`num_cpus*2+1`). In Docker set `?connection_limit=5` on `DATABASE_URL` per app container.
- **Migrations:** hand-written SQL is reviewed but unchecked → run `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code` in CI; deploy with `prisma migrate deploy` (never `migrate dev` in production).
- **Permissions:** the app uses the DB owner. For production create an app role with DML only and run migrations with the owner role.
- **EXPLAIN:** worth running `EXPLAIN (ANALYZE, BUFFERS)` on the guest list query in a staging copy once real events exceed a few thousand guests.

## 5. Docker recommendations

Today only Postgres is containerised. For a Docker-based deployment:

1. `next.config.ts`: `output: "standalone"`.
2. **Multi-stage `Dockerfile`** (`deps` → `build` → `runner` on `node:22-alpine`), `npm ci`, `prisma generate`, `next build`; runner copies `.next/standalone`, `.next/static`, `public`, `prisma`; runs as the non-root `node` user; `HEALTHCHECK` on a new `/api/health` (DB `SELECT 1`).
3. **`.dockerignore`**: `node_modules`, `.next`, `.env*`, `uploads`, `.git`, `*.log`.
4. **Compose (production profile)**: `app` (depends on `db: service_healthy`), one-shot `migrate` service running `prisma migrate deploy`, named volumes for `pgdata` and `uploads`, `restart: unless-stopped`, `env_file` for secrets, DB port not published, memory limits, `json-file` logging with rotation.
5. Graceful shutdown: Node handles `SIGTERM` (use `init: true` in compose).

No existing volume is touched by any of this.

## 6. Testing recommendations

Add **Vitest** (dev dependency, justified: none exists today) and start with pure logic that has already caught bugs in this project:
- `expense-io` / `gift-io` / `guest-io` parsers (the couple's real sheet layout, $/៛ columns, TOTAL rows);
- money parsing (L-2), `formatMoney`, `payStatus`;
- `telegramProfile` (valid / tampered / expired), `userForSocial` linking rules (S-1);
- rate limiter (S-2).
Then integration tests for server actions against a throwaway database (ownership: user A cannot touch user B's event), plus `next build` and `docker compose up` smoke checks.

---

## 7. Refactoring plan (proposed order — each step a small, separate commit)

| Step | What | Behaviour change? | Migration? |
|---|---|---|---|
| 0 | Commit the current working tree as-is (H-4) | no | no |
| 1 | Fix the production build: self-host Noto Serif Khmer (C-1) | no | no |
| 2 | Security headers (M-2), guest-export `select` (M-8), import size/row caps (M-5) | caps only reject oversized files | no |
| 3 | Upload magic-byte validation (M-3) | rejects fake image/audio files | no |
| 4 | Social-login linking rule (S-1) | **yes** — Google no longer joins a password account automatically | no |
| 5 | Rate limiting for login / register / RSVP + anonymous-RSVP cap (S-2, M-4) | **yes** — too many attempts get blocked | **yes** (new table) |
| 6 | DB port to localhost + credentials from `.env` (M-1) | dev setup only | no |
| 7 | Dockerfile, `.dockerignore`, health route, production compose (§5, H-3, L-7) | no | no |
| 8 | Vitest + first test suites (§6, M-10) | no | no |
| 9 | Clean-ups: shared parse helpers (L-2), zod decision (L-1), dictionary slimming (M-6), session purge (L-6), Telegram window (L-5), currency CHECKs (L-8) | no | L-8 yes |

Steps 4 and 5 change behaviour and step 5 adds a table, so they need explicit approval.

## 8. Remaining risks / not verified

- No load or penetration testing; no staging database, so no `EXPLAIN` plans.
- Image storage in Postgres (M-7) is a scaling limit, not fixed by this plan.
- Next.js and ExcelJS advisories depend on upstream releases.
- The KHQR crop and dashboard currency maths are verified manually, not by automated tests yet.
