# Beulah Methodist Church – Church Management System

A web app for running church administration: membership, households, class meetings and groups, events and attendance, giving, announcements, email, and reports. It uses Google sign-in and role-based access.

**Stack:** Next.js 16 (React 19, App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Neon Postgres · Drizzle ORM · Better Auth (Google)

## Features

| Area | What it does |
|---|---|
| **Members** | Full register: personal details, contacts, membership type and status, baptism/confirmation/marriage dates, notes, search and filters, CSV export |
| **Households** | Group family members together, with roles (head, spouse, child…) |
| **Groups & classes** | Class meetings, fellowships, choirs, Sunday school, youth, committees; rosters with leaders and assistants |
| **Events & attendance** | Services and meetings, a check-in register with search, headcount and visitor counts |
| **Giving** | Funds (tithe, offering, harvest…), contributions (cash, MoMo, bank, cheque), anonymous/loose offerings, pledges with progress bars, printable annual giving statements, CSV export |
| **Announcements** | Pinned and expiring notices targeted at everyone, leaders, or staff |
| **Messages** | Email broadcasts to all members, leaders or a group (via Resend), plus copy-ready phone and email lists for SMS/WhatsApp |
| **Reports** | Membership by status, type, age and gender; attendance trend; monthly giving; giving by fund; birthdays and anniversaries |
| **My profile** | Every member sees their own groups, attendance and giving, updates their contact details, and downloads their statement |
| **Admin** | Approve users, assign roles, link logins to member records, church settings (name, currency, time zone), and a full audit log |

## Roles

| Role | Access |
|---|---|
| Administrator | Everything, including users, roles, settings and the audit log |
| Minister / Pastor | Members, groups, events, announcements, messages, reports; can view giving |
| Church Secretary | Members, households, groups, events, attendance, announcements, messages, reports |
| Treasurer / Finance | Records and reports giving; can look up members |
| Class / Group Leader | Their own groups: roster and attendance |
| Member | Announcements, events, their own profile and giving |

Permissions are checked on the server for every page and every action (`src/lib/permissions.ts`).

**Sign-up flow:** anyone can sign in with Google. An account is approved automatically when the email is in `ADMIN_EMAILS` (it becomes Administrator) or matches a member's email on the register (it becomes Member, linked to that record). Everyone else waits on a "pending approval" page until an admin approves them under **Users & roles**.

## Setup

### 1. Neon database
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (Dashboard → Connect).

### 2. Google sign-in
1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **OAuth consent screen** and set it up (External).
2. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
3. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-DOMAIN/api/auth/callback/google`
4. Copy the Client ID and Client Secret.

### 3. Configure and run
```bash
npm install
cp .env.example .env.local      # then fill in the values
npx @better-auth/cli secret     # paste the output into BETTER_AUTH_SECRET
npm run db:migrate              # create the tables in Neon
npm run db:seed                 # add the default giving funds
npm run dev                     # http://localhost:3000
```
Put your own email in `ADMIN_EMAILS` so you become the first administrator. Then open **Settings** to confirm the church name, currency and time zone.

`npm run db:seed -- --demo` adds sample members, groups, services and giving. Use it only on a test database.

### Local development without Google
Set `ALLOW_DEV_LOGIN=true` in `.env.local` to show an email/password form on the sign-in page. It is always disabled in production builds.

## Deploying (Vercel)
1. Push this folder to a GitHub repository and import it at [vercel.com/new](https://vercel.com/new).
2. Add the variables from `.env.example` under Project → Settings → Environment Variables. Set `BETTER_AUTH_URL` to your production URL, and leave `ALLOW_DEV_LOGIN` unset.
3. Add the production callback URL to your Google OAuth client.
4. Deploy.

## Installable app (PWA)
The site can be installed like a phone or desktop app, with the Methodist Church Ghana logo as its icon.
- **Android / Chrome / Edge:** tap **Install app** (in the menu or on the sign-in page), or use the browser's "Install" option.
- **iPhone / iPad:** in Safari, tap Share → **Add to Home Screen**. The Install app button shows these steps.

How it works:
- `src/app/manifest.ts` defines the app name, colours, icons and shortcuts to Members, Events, Giving and My profile.
- `public/sw.js` is the service worker. It caches only static files (scripts, styles, icons). Church records are never stored on the device, so a lost or shared phone doesn't leak member or giving data. With no connection, `public/offline.html` is shown.
- The service worker registers only in production builds (`npm run build && npm start`). Installing requires HTTPS, which Vercel provides.
- Icons are generated from `assets/logo.png`. If the logo changes, run `node scripts/generate-icons.mjs`.

## Database changes
Edit `src/db/schema.ts`, then:
```bash
npm run db:generate   # writes a new SQL migration into /drizzle
npm run db:migrate    # applies it
```

## Project layout
```
src/
  app/(app)/        signed-in pages: dashboard, members, households, groups, events, giving, …
  app/sign-in       Google sign-in
  app/api/auth      Better Auth handler
  components/       UI building blocks, forms, charts
  db/schema.ts      all tables
  lib/              auth, permissions, session helpers, formatting, settings
scripts/seed.ts     default funds (+ optional demo data)
```
