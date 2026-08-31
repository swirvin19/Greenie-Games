# Greeni

A golf app: real accounts, cosmetic inventory + trading, seasonal passes with
free/premium reward tracks, a friend graph, live round tracking with 11 side
games, informal remote wagers, and friend/round chat with moderation — built
against the `schema.prisma` + README spec that started this project.

## Stack

- Next.js (App Router) + TypeScript, Route Handlers as the API layer
- Prisma + SQLite for local dev (see "Switching to Postgres" below — the
  original spec's datasource)
- Custom email/password auth (bcrypt + a signed JWT session cookie) — no
  third-party IdP is wired up yet; see "Auth" below
- Tailwind v4 for styling
- Vitest for the game-scoring engine's unit tests

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies migrations
npm run db:seed          # seeds 3 demo users, a season pass, and a course
npm run dev
```

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

Sign in with Apple is required by Apple if any third-party sign-in is
offered (per the original README), so Apple + Google should ship together,
not instead of email. Neither is wired up here — `User.authProvider` /
`authProviderId` are in the schema and ready for it, but there's no
Apple/Google developer credentials in this environment to integrate
against. Email/password auth is fully working (signup, login, sessions).

## Switching to Postgres

`prisma/schema.prisma` uses `provider = "sqlite"` so this runs with zero
external setup. Nothing in the schema is SQLite-specific — to move to
Postgres (the original spec's datasource), change the provider back to
`"postgresql"`, point `DATABASE_URL` at a real instance, and run `npx
prisma migrate dev` again.

## What's not here

No push notifications, no Apple/Google sign-in, no real payment processing
(by design — see `RemoteWager` above), and no licensed course-data provider
integration (`Course.externalId` is ready for one; courses are searched
from what's been manually entered locally, matching the spec's fallback
behavior).
