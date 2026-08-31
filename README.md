# Greeni Games

A golf app: real accounts, cosmetic inventory + trading, seasonal passes with
free/premium reward tracks, a friend graph, live round tracking with 11 side
games, informal remote wagers, and friend/round chat with moderation — built
against the `schema.prisma` + README spec that started this project.

## Stack

- Next.js (App Router) + TypeScript, Route Handlers as the API layer
- Prisma + Postgres (the original spec's datasource) — needed for a real
  deployment, since Vercel's serverless functions have no persistent local
  disk for a SQLite file to live on
- Custom email/password auth (bcrypt + a signed JWT session cookie), plus
  Google and Apple sign-in — see "Auth" below
- Tailwind v4 for styling
- Vitest for the game-scoring engine's unit tests

## Getting started

You need a Postgres database — a free one from [Neon](https://neon.tech) or
[Supabase](https://supabase.com) takes a couple of minutes to set up (see
"Deploying" below for click-by-click Neon steps).

```bash
cp .env.example .env   # then paste your real DATABASE_URL into it
npm install
npx prisma migrate dev   # applies migrations
npm run db:seed          # seeds 3 demo users, a season pass, and a course
npm run dev
```

**`.env` is git-ignored on purpose** (it can hold real secrets) — a fresh
clone has no `.env` file until you make one yourself from `.env.example`.
Skipping that step is the single most common reason `npx prisma migrate
dev` fails right after cloning.

Demo accounts (seeded): `jon@example.com`, `dale@example.com`,
`mia@example.com` — password `password123`. Jon and Dale start as friends.

```bash
npm test          # game-engine unit tests
npm run lint
npm run build
```

## Project layout

- `prisma/schema.prisma` — the data model (see "Changes from the original
  spec" below for the handful of additions)
- `prisma/seed.ts` — demo data
- `src/lib/games/` — the side-game scoring engine (`engine.ts`), pure
  functions with no I/O; `types.ts` documents every game's rules in one
  place, including the invented conventions for Vault and Chaos Mode
- `src/lib/progress.ts` — recomputes `UserProgress` counters and grants
  `PassReward` items after a round completes
- `src/lib/auth.ts`, `src/lib/social.ts` — session + friend-graph helpers
  shared across API routes
- `src/lib/oauth/` — Google and Apple OAuth: building the authorize URL,
  exchanging the code, verifying the id_token against each provider's JWKS
- `src/app/api/**` — the HTTP API (all mutations and reads go through here;
  pages are client components that call it)
- `src/app/**` (outside `api/`) — pages: dashboard, round creation + live
  scorecard, friends, trade, inventory, season pass, chat

## Changes from the original spec

The schema is used as given, with a few small, targeted additions where the
spec was explicitly a starting point:

- **`User.passwordHash`** — the spec's `authProvider`/`authProviderId` cover
  Apple/Google; email auth needs a password hash somewhere, and this is
  clearly a design spec, not a running service.
- **`Friendship.requestedById`** — `userAId`/`userBId` is documented as just
  an ID-sorted pair for the uniqueness constraint, so there was no way to
  know who sent a friend request. Needed to credit the right person for
  `PassReward.thresholdType = INVITES_CONVERTED` on accept.
- **`SeasonPassPurchase`** — a one-row-per-unlock ledger. `SeasonPass.priceCents`
  is described as "a single unlock price, no billing cycle" but nothing
  recorded whether a user had actually unlocked premium; this makes that
  real without adding any payment-processing fields (no processor, no card
  data — a real checkout flow would call `POST
  /api/season-passes/:id/purchase-premium` after charging elsewhere).

- **`@@unique([authProvider, authProviderId])` on `User`** — added with the
  Google/Apple sign-in flow, so a double-submitted OAuth callback can't
  create two accounts for the same identity. Doesn't constrain
  email/password users — every one of them has a `null` `authProviderId`,
  and Postgres treats `null`s as distinct in a unique index.

No other fields were added. `RemoteWager` still has no money fields —
that's enforced by not having a purchase/settlement amount anywhere in the
wager API, matching the spec's explicit "tracker, not a payments product"
rule.

## The 11 side games

`src/lib/games/types.ts` has the full write-up. Short version: Nassau,
Skins, Stableford, Vegas, Wolf, and Banker follow standard/common house
rules. Greenie, King of the Green, and Bomb are closest-to-pin /
green-in-regulation / longest-drive bonuses marked directly on the
scorecard. Vault and Chaos Mode aren't standardized golf games — the engine
picks explicit, documented conventions for both (a pooled bonus paid to the
hole-win leader; a seeded per-hole random game pick) since the original
`greenie.html` prototype these were meant to port from isn't in this repo.

## Auth

Email/password, Google, and Apple sign-in all work, all landing in the same
`User` table and the same session cookie — `POST /api/auth/login` and the
OAuth callbacks both end by calling the same `setSessionCookie`. Google and
Apple use plain OAuth 2.0 authorization-code flows (`src/lib/oauth/`), not
a library like NextAuth, to stay consistent with the rest of the app's
hand-rolled auth.

Both need real credentials from Google/Apple's own developer consoles —
nothing here can create those for you. Set these in `.env` (placeholders
are already there, commented out):

**Google** (free, ~10 minutes, at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)):
1. Create or pick a project, then **APIs & Services → OAuth consent
   screen** — External, fill in an app name and your email, save.
2. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID** — type **Web application**.
3. Under **Authorized redirect URIs**, add
   `http://localhost:3000/api/auth/google/callback` for local dev, plus
   your production URL's equivalent once you have one.
4. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`; set `GOOGLE_REDIRECT_URI` to the exact URI from
   step 3.

**Apple** (needs a $99/year [Apple Developer Program](https://developer.apple.com/programs/) membership, and is
only actually *required* if you ship this through the App Store — a plain
website doesn't have to offer it):
1. **Certificates, Identifiers & Profiles → Identifiers → App IDs** —
   register one (or use an existing one) with the "Sign In with Apple"
   capability turned on.
2. **Identifiers → Services IDs** — register a new one (e.g.
   `com.yourcompany.greeni.web`); this is your `APPLE_CLIENT_ID`, *not*
   the App ID from step 1. Configure it for "Sign In with Apple", and add
   your domain plus the return URL
   `http://localhost:3000/api/auth/apple/callback` (add the production
   equivalent later — Apple requires HTTPS there, localhost is only
   allowed for the App ID's own testing, so you'll need a real domain to
   test this end-to-end, not just `npm run dev`).
3. **Keys → create a new key** with "Sign In with Apple" enabled, associate
   it with the App ID from step 1. Download the `.p8` file — Apple only
   lets you download it once. Note the **Key ID** shown on that page.
4. Also note your **Team ID** (top right of the developer portal, or
   **Membership** page).
5. Set `APPLE_CLIENT_ID` (the Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
   and `APPLE_REDIRECT_URI`. For `APPLE_PRIVATE_KEY`, paste the full
   contents of the `.p8` file with real newlines replaced by literal `\n`
   (the code un-escapes them at runtime) — e.g.
   `"-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----\n"`.

A couple of Apple-specific quirks the code accounts for: Apple only sends
an email and a name at all on a user's *first* authorization ever for this
app — returning sign-ins carry neither, so returning users are matched by
Apple's stable `sub` identifier, not email. And Apple's callback is a POST
with form-encoded data (`response_mode=form_post`), not a redirect with a
query string like Google's, because Apple's own sign-in sheet is the one
making that request, not the user's browser navigating directly.

## Deploying (Vercel + Neon, no local setup required)

`npm run build` runs `prisma migrate deploy` before `next build`, and
`postinstall` runs `prisma generate` — so a host that runs `npm install`
then `npm run build` (Vercel does both automatically) sets up the database
schema by itself. Nothing to run by hand beyond setting the environment
variables below.

1. **Get a free Postgres database** at [neon.tech](https://neon.tech) — sign
   up, create a project, and copy the connection string it shows you
   (starts with `postgresql://`).
2. **Go to [vercel.com](https://vercel.com)**, sign up/log in (using GitHub
   is easiest), click **Add New… → Project**, and import this repository.
3. Vercel auto-detects Next.js — before clicking Deploy, open **Environment
   Variables** and add:
   - `DATABASE_URL` — the connection string from step 1
   - `AUTH_SECRET` — any long random string you make up
   - (optional) the `GOOGLE_*` / `APPLE_*` variables from the Auth section
     above, once you have them — using your Vercel URL (e.g.
     `https://your-app.vercel.app/api/auth/google/callback`) as the
     redirect URI instead of `localhost`
4. Click **Deploy**. Vercel installs dependencies, applies the database
   migrations, and builds the app — you'll get a real URL
   (`https://your-app.vercel.app`) when it finishes.
5. Open that URL and click **Sign up** to create a real account — the
   deployed database starts empty, so there's no seeded demo data unless
   you run `npm run db:seed` yourself against that same `DATABASE_URL`.

## What's not here

No push notifications, no real payment processing (by design — see
`RemoteWager` above), and no licensed course-data provider integration
(`Course.externalId` is ready for one; courses are searched from what's
been manually entered locally, matching the spec's fallback behavior).
