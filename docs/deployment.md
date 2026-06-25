# cloud Deployment Notes

Status: current deployment notes
Date: 2026-06-25

## Deployment Classification

`cloud` is a Peripheral Vercel project: Next.js App Router + Prisma +
PostgreSQL. Local validation used Homebrew PostgreSQL 17 and a local
`rustzen_cloud_test` database.

## Vercel Fact Sheet

| Item | Current evidence | Status |
| --- | --- | --- |
| Project/team | `.vercel/project.json` points to project `cloud` under `abin-projects` | local link verified |
| Domain | `cloud.rustzen.dev` on Vercel project `cloud` | production verified |
| Framework | Next.js from `package.json` and `src/app` | source |
| Build command | `pnpm build` -> `node scripts/with-env.mjs prisma generate && next build` | verified locally |
| Output directory | Next.js managed output | local build verified; Vercel output not verified |
| Package manager | `pnpm-lock.yaml`, `pnpm-workspace.yaml` | source |
| Env source | `.env.example` names | source |
| Vercel env | Vercel project settings | not reverified in this pass |
| Runtime limits | Not found | not verified |
| `vercel.json` | Not found | not verified |
| `next.config.*` | Not found | not verified |

`.env.local`, `.next/`, `.vercel/`, and `node_modules/` are ignored/local-only.
`.vercel/` identifies the local Vercel link on this machine, but it is not
committed deploy truth and must not be committed. `.env.local` contains local
secrets and database URLs and must not be committed.

## Environment Groups

From `.env.example`:

| Group | Env names | Review concern |
| --- | --- | --- |
| Database | `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Prisma connectivity and migration target |
| Database platform reserve | `POSTGRES_URL` | Vercel/Postgres compatibility value; current Prisma datasource does not read it |
| Public URLs | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | `NEXT_PUBLIC_APP_URL` should point at `https://cloud.rustzen.dev`; `NEXT_PUBLIC_SITE_URL` should point at `https://app.rustzen.dev` for public checkout return links |
| Admin auth | `RUSTZEN_ADMIN_USERNAME`, `RUSTZEN_ADMIN_PASSWORD`, `RUSTZEN_ADMIN_SECRET`, `RUSTZEN_ADMIN_API_TOKEN` | Dashboard credential handling, session signing, and operational API access |
| License/webhook | `LICENSE_JWT_SECRET`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `CREEM_WEBHOOK_SECRET` | `LICENSE_JWT_SECRET` signs opaque license bearer tokens and is required in production; webhook secrets verify provider HMAC signatures |
| Creem checkout | `CREEM_API_KEY`, `CREEM_RUSTZEN_CLEAR_PRODUCT_ID`, `CREEM_CHECKOUT_SUCCESS_URL` | Rustzen Clear Pro checkout and subscription fulfillment; current product id is `prod_4Wa3YyJe3bn8hNuotPlSYj` |
| Zen Clear updater/downloads | `RUSTZEN_CLEAR_UPDATE_MANIFEST_URL`, `RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN` | Manifest source and optional Blob origin allow-list for rewriting update asset URLs through `/api/updates/download`; `/api/updates/download/latest` resolves the current DMG for manual downloads, while `format=updater` resolves the updater archive |
| Legacy license proxy | `RUSTZEN_LICENSE_SERVER_URL`, `RUSTZEN_LICENSE_SERVER_TOKEN` | Optional external license-server compatibility path, not the default desktop-client API |

The production domains are `https://cloud.rustzen.dev` for the dashboard/API
and `https://app.rustzen.dev` for the public site. The latest verified
production deployment is `dpl_EfgfPjCAnkU4uDqTkRHS1ghUgoTh`, created from
GitHub `rustzen/cloud` commit `4f8c0d1` after the repository was made public.
Preview and production Vercel env values require live dashboard verification.
Rustzen Clear Pro is a Creem annual subscription at USD $10/year. Creem webhook
events must identify the Rustzen product through metadata or the configured
product id; webhook ingestion records events without creating a license when the
product cannot be resolved.

## Local Database Verification

Verified on 2026-06-15:

1. `brew services start postgresql@17`
2. `pg_isready -h 127.0.0.1 -p 5432`
3. `createdb -h 127.0.0.1 -p 5432 rustzen_cloud_test`
4. `.env.local` pointed Prisma URLs to `rustzen_cloud_test`
5. `pnpm db:push`
6. `pnpm db:seed`
7. `pnpm db:verify`
8. `psql -h 127.0.0.1 -p 5432 -d rustzen_cloud_test -c 'SELECT code, name FROM "Product" ORDER BY code;'`

`pnpm db:verify` reported:

```json
{
  "products": 2,
  "licenses": 0,
  "devices": 0,
  "versions": 0,
  "billingEvents": 0
}
```

## Pre-Deploy Gate

Before any deploy:

1. Run `git status --short --branch` in `cloud`.
2. Confirm current `package.json` scripts and package manager.
3. Configure required Vercel preview/prod env values; do not commit secrets.
4. Decide Prisma migration strategy before touching a real database.
5. Run `pnpm db:generate`, `pnpm lint`, and `pnpm build`.
6. If database behavior changed, validate against a local test DB with
   `pnpm db:push`, `pnpm db:seed`, and `pnpm db:verify`.
7. Confirm Vercel project/team/domain and keep Prisma-backed API routes on the
   Node runtime.
8. Confirm the Creem live product remains subscription-only:
   `price=1000`, `currency=USD`, `billing_type=recurring`, and
   `billing_period=every-year`.
9. Record verification evidence in the task report.

`pnpm db:push` against production, production Vercel deploys, and real webhook
testing require explicit user approval.

## Not Found

- Committed `vercel.json`
- Committed `next.config.*`
- Committed CI workflow
- Committed Prisma migration files

## Verified

- Vercel domain: `cloud.rustzen.dev` verified on 2026-06-25.

## Not Verified

- Vercel preview/prod environment values; current Vercel project has no env vars.
- Production PostgreSQL database availability.
- Production Prisma migration state.
- Creem webhook delivery and live product configuration.
- Lemon Squeezy webhook delivery for the legacy route.
- Desktop client consumption of activation or version routes.
