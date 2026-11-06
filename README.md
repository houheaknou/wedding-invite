# Mongkol (មង្គល) — wedding planner & e-invitation

A Khmer-first web app for couples to plan a wedding: create wedding events and
manage the guest list (add/edit/search, import & export Excel/CSV).

> "Mongkol" is a working name — change `appName` in `src/lib/i18n.ts`.

## Stack

- **Next.js 15** (App Router, TypeScript, server actions) + **Tailwind CSS 4**
- **PostgreSQL 16** via **Prisma 6** (Postgres runs in Docker for local dev)
- `exceljs` (xlsx) and `papaparse` (csv) for guest import/export
- Font: **Noto Sans Khmer** (Khmer) + **Inter** (Latin) via `next/font/google`

## Getting started

Requires Node 20+ and Docker.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # DATABASE_URL points at the compose DB on port 5434
docker compose up -d        # Postgres -> localhost:5434
npx prisma migrate dev      # apply migrations
npm run db:seed             # optional demo data
npm run dev                 # http://localhost:3000
```

The seed creates a demo account `demo@example.com` / `demo12345`
(override with `SEED_EMAIL` / `SEED_PASSWORD`) with one event and 8 guests.
Re-running the seed resets that account's events.

Postgres is published on **127.0.0.1:5434** — this computer only, not the
LAN/Wi-Fi — and not 5432, so it doesn't collide with a locally installed
Postgres. Change both `docker-compose.yml` and `.env` if needed.

### Database password

`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` in `.env` are used only
when the data volume is **first created**; changing them later does not change
an existing database. To change the password of the existing one (no data is
touched):

```bash
docker exec -it wedding-invite-db psql -U wedding -d wedding_invite -c "ALTER USER wedding PASSWORD 'new-long-random-password'"
```

then put the same password in `.env` — in both `POSTGRES_PASSWORD` and
`DATABASE_URL` — and restart `npm run dev`.

After pulling schema changes, run `npx prisma migrate dev` and **restart
`npm run dev`**. On Windows the running dev server locks Prisma's engine DLL, so
`prisma generate` fails with `EPERM` and the server keeps the old client in
memory until it is restarted.

Useful scripts: `npm run db:up`, `npm run db:migrate`, `npm run db:seed`,
`npm run db:studio`, `npm run lint`, `npm run build`.

## What's in the MVP

- **Accounts** — sign up / log in with email **or** phone number + password
  (bcrypt). Sessions are random tokens in an httpOnly cookie; only their SHA-256
  hash is stored (`Session` table), 30-day expiry.
- **Events** — a user can create many: cover photo (JPG/PNG/WebP up to 3 MB,
  stored in the DB and served by `/api/events/[id]/cover` to the owner only),
  event name, type (wedding / engagement / birthday / other), groom & bride
  names, date and time, venue, address, map link, notes and an agenda (one
  item per line). Times are entered and shown in Cambodia time
  (`Asia/Phnom_Penh`, UTC+7).
- **Event workspace** — each event opens as tabs: *Dashboard* (event card with
  countdown, colored stat cards, guest-status donut, guest stats by status and
  side, agenda timeline), *Guests* and *Template*. *Expenses*, *Gifts* and *More*
  are placeholder "coming soon" tabs.
- **Invitation template editor** (*Template* tab) — editor panel on the left, live
  phone preview on the right. Choose one of three CSS-only templates (Classic
  gold, Blossom, Minimal), the invitation language (Khmer/English, independent
  of the UI language), title text with a three-color gradient (top / bottom /
  outline), the invitation message, which sections to show (date & venue,
  countdown, agenda) and background music (upload your own MP3/M4A/OGG/WAV,
  ≤10 MB; stored under `uploads/music/`, which is gitignored).
- **Royal gold template + Invitation Builder** — the *Template* tab is a builder
  with five tabs (Basic info, Couple & parents, Programme, Venue & RSVP, Design),
  a live phone preview and the preview link. Royal gold follows the owner's
  reference design (`docs/design/royal-gold.html`): bilingual Khmer/English,
  Moul + Noto Serif Khmer + Cormorant Garamond, the owner's flower/temple art
  (`public/templates/royal/`, cut from the reference and upscaled — replace with
  high-resolution originals when available), framed sections, multi-day
  programme, venue photo + Google map, and an RSVP form. On screens ≥440px the
  cover is the original artwork with live text laid over it; on phones it stacks.
- **RSVP** — replies from the public page are stored (`Rsvp`) and folded into the
  guest list: the personal-link guest or a guest with the same phone is updated,
  otherwise a guest is added (group "RSVP"). Replies show on the Dashboard. A
  honeypot field stops simple bots; there is no rate limiting yet.
- **Programme format** — `Event.agenda` holds `## Day title | date` headings
  followed by `07:00 AM Activity` lines; the builder edits it day by day.
- **Public invitation page** — `/i/<shareId>` and a personal link per guest,
  `/i/<shareId>/<guestId>`, that puts the guest's name on the banner (copy it from
  the link icon in the guest list). Links only work while *Guests can open it*
  is switched on; cover and music are then served from `/api/invite/<shareId>/…`.
  Pages are `noindex`. Music starts on the visitor's first tap (browsers block
  autoplay). Dates on invitations are worded by hand in Khmer with Khmer
  numerals, because many browsers ship without Khmer locale data.
- **Guest list** per event — name, phone, side (bride / groom / both), group,
  number of people, status (not invited yet / invited / attending / declined),
  notes. Add (dialog), edit, delete, search by name/phone/group, filter by
  group, side and status, pagination with page size; a card list on phones.
- **Import** `.xlsx` or `.csv`. The header row is detected by a *Name* column;
  headers are matched in Khmer or English (`ឈ្មោះ`/`Name`, `លេខទូរស័ព្ទ`/`Phone`,
  `ខាង`/`Side`, `ក្រុម`/`Group`, `ចំនួនមនុស្ស`/`People`, `ស្ថានភាព`/`Status`,
  `កំណត់ចំណាំ`/`Notes`). Side/status accept the enum names or the UI labels in
  either language; Khmer digits are accepted for the count. Rows with no name
  are skipped and counted. Imports append; they don't de-duplicate.
- **Export** `.xlsx` or `.csv` (UTF-8 with BOM so Excel shows Khmer), plus a
  blank template. Exports use the current UI language and re-import cleanly.
- **Khmer / English UI** — Khmer is the default; the choice is stored in a
  `lang` cookie. All strings live in `src/lib/i18n.ts`.

## Layout

```
prisma/schema.prisma        User, Session, Event, Guest
prisma/seed.ts              demo data
src/lib/auth.ts             sessions, requireUser, requireOwnedEvent
src/lib/i18n.ts             km/en dictionaries
src/lib/guest-io.ts         xlsx/csv parse + build
src/lib/format.ts           Cambodia-time date helpers, cover URL, countdown
src/lib/constants.ts        enum lists + chip colors shared with client components
src/actions/*.ts            server actions (auth, events, guests, import)
src/app/(auth)/…            login, register
src/app/(app)/events/…      event list, create/edit
src/app/(app)/events/[id]/(workspace)/…  tab layout: dashboard, guests (+ guest
                            edit), coming-soon tabs
src/app/api/events/[id]/guests/export   xlsx/csv download
src/app/api/events/[id]/cover           cover photo (owner)
src/app/api/events/[id]/music           music (owner, for the editor preview)
src/app/api/invite/[shareId]/{cover,music}  public media for published invitations
src/app/i/[shareId]/…       public invitation (+ /[guestId] personal link)
src/components/InvitationView.tsx  invitation renderer shared by preview and public page
src/components/TemplateEditor.tsx  template editor
src/lib/invitation.ts       templates, invitation wording, Khmer date formatting
src/lib/media.ts            music storage/streaming, invitation data mapping
docs/design-refs/           style references (layout/style only — no assets reused)
```

Every event/guest action re-checks that the event belongs to the signed-in user.

## Roadmap (not built yet)

- Google and Telegram login; password reset; phone OTP verification
- Invitation extras: animated templates, map embed, add-to-calendar,
  photo/video gallery, guest wishes, RSVP, paid templates
- Sending invitations (Telegram / SMS share links per guest)
- Gift money (ចំណងដៃ) tracking per guest, in KHR and USD
- Budget / expense planning
- Pricing tiers (e.g. free plan guest limit, paid templates)
- De-duplication on import, bulk status changes / bulk delete
- Move cover photos and music to object storage (S3/R2) for production;
  local `uploads/` won't survive a container redeploy
- Tests and CI
