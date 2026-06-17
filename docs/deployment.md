# rustzen-cloud Deployment Notes

Status: current deployment notes
Date: 2026-06-16

## Deployment Classification

`rustzen-cloud` is a Peripheral Vercel project: Next.js App Router + Prisma +
PostgreSQL. Local validation used Homebrew PostgreSQL 17 and a local
`rustzen_cloud_test` database.

## Vercel Fact Sheet

| Item | Current evidence | Status |
| --- | --- | --- |
| Project/team | `.vercel/project.json` points to project `rustzen-cloud` under `abin-projects` | local link verified |
| Domain | Not found in committed files | not verified |
| Framework | Next.js from `package.json` and `src/app` | source |
| Build command | `pnpm build` -> `node scripts/with-env.mjs prisma generate && next build` | verified locally |
| Output directory | Next.js managed output | local build verified; Vercel output not verified |
| Package manager | `pnpm-lock.yaml`, `pnpm-workspace.yaml` | source |
| Env source | `.env.example` names | source |
| Vercel env | `pnpm dlx vercel env ls` | no variables configured |
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
| Public URL reserve | `NEXT_PUBLIC_APP_URL` | Reserved for future callback/link consistency; current source does not read it |
| Admin auth | `RUSTZEN_ADMIN_PASSWORD`, `RUSTZEN_ADMIN_SECRET` | Password handling and session signing |
| License/webhook | `LICENSE_JWT_SECRET`, `LEMONSQUEEZY_WEBHOOK_SECRET` | `LICENSE_JWT_SECRET` signs opaque license bearer tokens and is required in production; `LEMONSQUEEZY_WEBHOOK_SECRET` verifies webhook HMAC |
| Legacy license proxy | `RUSTZEN_LICENSE_SERVER_URL`, `RUSTZEN_LICENSE_SERVER_TOKEN` | Optional external license-server compatibility path, not the default desktop-client API |

Preview and production Vercel values are not configured as of 2026-06-15.
Lemon Squeezy products must send `custom_data.product` with the RustZen product
code; webhook ingestion records events without creating a license when the
product code is missing or unknown.

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

1. Run `git status --short --branch` in `rustzen-cloud`.
2. Confirm current `package.json` scripts and package manager.
3. Configure required Vercel preview/prod env values; do not commit secrets.
4. Decide Prisma migration strategy before touching a real database.
5. Run `pnpm db:generate`, `pnpm lint`, and `pnpm build`.
6. If database behavior changed, validate against a local test DB with
   `pnpm db:push`, `pnpm db:seed`, and `pnpm db:verify`.
7. Confirm Vercel project/team/domain and keep Prisma-backed API routes on the
   Node runtime.
8. Record verification evidence in the task report.

`pnpm db:push` against production, production Vercel deploys, and real webhook
testing require explicit user approval.

## Not Found

- Committed `vercel.json`
- Committed `next.config.*`
- Committed CI workflow
- Committed Prisma migration files

## Not Verified

- Vercel domain.
- Vercel preview/prod environment values; current Vercel project has no env vars.
- Production PostgreSQL database availability.
- Production Prisma migration state.
- Lemon Squeezy webhook delivery.
- Desktop client consumption of activation or version routes.
