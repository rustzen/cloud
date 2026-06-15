# rustzen-cloud Project Map

Status: current project map
Date: 2026-06-15
Project type: Peripheral RustZen Cloud

## Current Facts

Command evidence from 2026-06-15:

- `git -C rustzen-cloud status --short --branch`: branch `main...origin/main`
  during the validation pass.
- `git -C rustzen-cloud status --ignored --short`: `.env.local`, `.next/`,
  `.vercel/`, and `node_modules/` are ignored/local-only.
- `pnpm dlx vercel env ls`: project `abin-projects/rustzen-cloud` has no
  configured Vercel environment variables.
- `pg_isready -h 127.0.0.1 -p 5432`: local Homebrew PostgreSQL accepts
  connections.
- `psql -h 127.0.0.1 -p 5432 -d rustzen_cloud_test`: local test database is
  reachable as user `daibin`.

## Stack

| Area | Evidence | Status |
| --- | --- | --- |
| Web framework | `package.json`, `src/app` | source |
| Runtime | Next.js App Router, React, TypeScript | source |
| Styling | Tailwind CSS plus `src/app/globals.css` | source |
| Database | Prisma + PostgreSQL | source; local test DB verified |
| Analytics | `@vercel/analytics` in `src/app/layout.tsx` | source |
| Hosting target | Vercel project link in `.vercel/project.json` | local link verified; env not configured |

## Package Manager And Commands

`pnpm-lock.yaml` and `pnpm-workspace.yaml` are the package-manager evidence.
Commands below come from `package.json`.

| Command | Script | Verification |
| --- | --- | --- |
| `pnpm dev` | `next dev` | Not run in this pass |
| `pnpm build` | `node scripts/with-env.mjs prisma generate && next build` | Passed on 2026-06-15 |
| `pnpm start` | `next start` | Not run; requires prior build |
| `pnpm lint` | `eslint .` | Passed on 2026-06-15 |
| `pnpm db:generate` | `node scripts/with-env.mjs prisma generate` | Passed on 2026-06-15 |
| `pnpm db:push` | `node scripts/with-env.mjs prisma db push` | Passed against local `rustzen_cloud_test` on 2026-06-15 |
| `pnpm db:seed` | `node scripts/with-env.mjs node prisma/seed.mjs` | Passed against local `rustzen_cloud_test` on 2026-06-15 |
| `pnpm db:verify` | `node scripts/verify-db.mjs` | Passed against local `rustzen_cloud_test` on 2026-06-15 |
| `pnpm db:studio` | `node scripts/with-env.mjs prisma studio` | Not run |

## Directory Map

| Path | Purpose | Status |
| --- | --- | --- |
| `README.md` | Project overview and scope | source |
| `.env.example` | Env-name reference | source |
| `.gitignore` | Ignores dependencies, env, build output, `.vercel/` | source |
| `package.json` | Next.js, Prisma, ESLint scripts and dependencies | source |
| `scripts/with-env.mjs` | Loads `.env.local`/`.env` before Prisma CLI commands | source |
| `scripts/verify-db.mjs` | Verifies database connection and table counts | source |
| `prisma/schema.prisma` | Product/license/device/version/billing schema | source |
| `prisma/seed.mjs` | Seeds `rustzen-clear` and `rustzen-clipboard` products | source |
| `src/app/layout.tsx` | Root layout and Vercel Analytics | source |
| `src/app/page.tsx` | Redirects `/` to `/dashboard` | source |
| `src/app/login/page.tsx` | Password-based admin login | source |
| `src/app/dashboard/page.tsx` | Dashboard index | source |
| `src/app/dashboard/licenses/page.tsx` | License and device management | source |
| `src/app/dashboard/versions/page.tsx` | Release metadata management | source |
| `src/app/api/**/route.ts` | Cloud API routes | source |
| `src/lib/auth.ts` | Cookie session signing and password check | source |
| `src/lib/license-server.ts` | License-server proxy helper | source |
| `src/lib/prisma.ts` | Prisma client singleton | source |
| `.env.local` | Local secrets and test DB URL | ignored/local-only |
| `.vercel/` | Local Vercel project link | ignored/local-only |
| `.next/` | Local Next.js build output | ignored/local-only |
| `node_modules/` | Local dependency install output | ignored/local-only |

## API Routes

| Route | File | Responsibility | Status |
| --- | --- | --- | --- |
| `POST /api/licenses/activate` | `src/app/api/licenses/activate/route.ts` | Local Prisma-backed license activation | source |
| `POST /api/ls/activate` | `src/app/api/ls/activate/route.ts` | Proxy activation request to external license server | source |
| `GET /api/ls/health` | `src/app/api/ls/health/route.ts` | Proxy external license-server health | source |
| `GET /api/versions?product=<code>` | `src/app/api/versions/route.ts` | Latest release metadata by product/platform | source |
| `POST /api/webhooks/lemonsqueezy` | `src/app/api/webhooks/lemonsqueezy/route.ts` | Verify Lemon Squeezy signature and create billing/license records | source |

## Data Model

`prisma/schema.prisma` defines:

- `Product`
- `License`
- `LicenseDevice`
- `AppVersion`
- `BillingEvent`
- `LicenseStatus`

The datasource uses `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
Local schema push and read-only count verification passed against
`rustzen_cloud_test` on 2026-06-15.

## Environment Names

From `.env.example`:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL`
- `NEXT_PUBLIC_APP_URL`
- `RUSTZEN_ADMIN_PASSWORD`
- `RUSTZEN_ADMIN_SECRET`
- `RUSTZEN_LICENSE_SERVER_URL`
- `RUSTZEN_LICENSE_SERVER_TOKEN`
- `RUSTZEN_LICENSE_SECRET` (reserved/not wired in current `src/`)
- `LEMONSQUEEZY_WEBHOOK_SECRET`

Real preview/prod Vercel values are not configured as of `pnpm dlx vercel env ls`
on 2026-06-15.

## High-Risk Areas

- Production Vercel env is empty; deploys will not have database or secret env
  until configured.
- Prisma schema changes affect production data and need an explicit migration
  gate.
- `pnpm db:push` mutates the target database. Use only against local test DB
  unless production approval is explicit.
- Lemon Squeezy webhook verification depends on `LEMONSQUEEZY_WEBHOOK_SECRET`.
- Admin session signing depends on `RUSTZEN_ADMIN_SECRET`; the code contains a
  development fallback for local use and throws in production when the secret is
  missing.
- License-server proxy requests depend on `RUSTZEN_LICENSE_SERVER_URL` and
  optional bearer token.
- `RUSTZEN_LICENSE_SECRET` is present in `.env.example` but not referenced by
  current `src/`; treat it as reserved/not wired until source changes.
- `.env.local`, `.next/`, `.vercel/`, and `node_modules/` are ignored/local-only
  and not committed deployment facts.
- Vercel domain, production env, preview env, and runtime limits are not
  verified.

## Recommended Reading Order

For API work:

1. `AGENTS.md`
2. `.env.example`
3. `prisma/schema.prisma`
4. `src/lib/prisma.ts`
5. The target `src/app/api/**/route.ts`
6. `docs/architecture.md`

For dashboard work:

1. `AGENTS.md`
2. `src/lib/auth.ts`
3. `src/app/layout.tsx`
4. The target `src/app/dashboard/**/page.tsx`
5. `src/app/globals.css`

For deploy/env work:

1. `AGENTS.md`
2. `docs/deployment.md`
3. `.env.example`
4. `package.json`
5. `prisma/schema.prisma`
