# rustzen-cloud Agent Guide

## Scope

`rustzen-cloud` is a Peripheral RustZen Cloud project. It is intended to be the
Next.js dashboard and cloud API surface for RustZen desktop products, including
license activation, release metadata, Lemon Squeezy webhooks, and an admin
dashboard.

It is not a core Rust service, Linux release bundle, Web/Rust admin template, or
Tauri desktop client. Do not apply `/opt`, systemd, Docker release bundle,
`apps/server`, `apps/web`, `crates/*`, or Tauri updater rules to this repository.

## Source Boundary

As of the local validation pass on 2026-06-15:

- source intended for commit: `README.md`, `.env.example`, `.gitignore`,
  `AGENTS.md`, `docs/`, `package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `prisma/`, `scripts/`, `src/`, `tsconfig.json`,
  `eslint.config.mjs`, `next-env.d.ts`
- ignored/local-only: `.next/`, `.vercel/`, `node_modules/`
- ignored/local secret/runtime env: `.env.local`, `.env`, `.env.*.local`

Do not treat `.env.local`, `.next/`, `.vercel/`, or `node_modules/` as source
truth. They are local runtime/dependency/deploy-link artifacts.

## Task Start Rules

1. Run `git status --short --branch` before editing, building, testing,
   deploying, staging, committing, or deleting files.
2. Preserve unrelated dirty work and ignored local runtime files.
3. Read only the files relevant to the requested change: `package.json`,
   `.env.example`, `prisma/schema.prisma`, the specific `src/app/**/route.ts`
   or dashboard page, and these docs.
4. Treat `docs/project-map.md` as a routing map, not runtime proof.
5. Mark facts as `tracked`, `modified tracked`, `untracked`, `ignored/local-only`,
   `runtime verified`, or `not verified` in reports.

## Repository Structure

| Path | Current status | Purpose |
| --- | --- | --- |
| `README.md` | source | Project overview |
| `package.json` | source | Next.js, Prisma, lint, build, dev scripts |
| `.env.example` | source | Required environment names |
| `prisma/schema.prisma` | source | Product, license, device, version, billing models |
| `prisma/seed.mjs` | source | Initial RustZen product records |
| `scripts/with-env.mjs` | source | Loads `.env.local`/`.env` before Prisma CLI commands |
| `scripts/verify-db.mjs` | source | Verifies DB connection and table counts |
| `src/app` | source | Next.js App Router pages and API routes |
| `src/lib` | source | Admin session, Prisma client, license-server proxy |
| `.vercel/` | ignored/local-only | Local Vercel project link; not deploy truth |
| `.next/` | ignored/local-only | Local Next.js build output |
| `node_modules/` | ignored/local-only | Local dependency install output |
| `.env.local` | ignored/local-only | Local secrets and database URL |

## Commands

The following commands come from `package.json`; re-check that file before using
them:

| Command | Purpose | Notes |
| --- | --- | --- |
| `pnpm dev` | Start local Next.js dev server | Requires local env for DB-backed pages |
| `pnpm build` | Run Prisma generate through `scripts/with-env.mjs`, then Next build | Verified locally on 2026-06-15 |
| `pnpm start` | Start production Next.js server | Requires prior build |
| `pnpm lint` | Run ESLint | Verified locally on 2026-06-15 |
| `pnpm db:generate` | Run Prisma client generation through `scripts/with-env.mjs` | Verified locally on 2026-06-15 |
| `pnpm db:seed` | Seed local product records | Verified against local Homebrew PostgreSQL on 2026-06-15 |
| `pnpm db:verify` | Verify database connection and table counts | Verified against local Homebrew PostgreSQL on 2026-06-15 |
| `pnpm db:studio` | Open Prisma Studio | Local inspection only |
| `pnpm db:push` | Push Prisma schema to DB | Verified against local test DB; production requires explicit approval |

Use Volta-managed Node, npm, pnpm, and yarn on this machine.

## Environment And Deploy Rules

- Do not commit real secrets or `.env*` files.
- `.env.example` is the candidate env-name reference.
- `.next/`, `.vercel/`, and `node_modules/` are ignored/local-only and must not
  be committed.
- Vercel project/team exists in local `.vercel/project.json`, but `vercel env ls`
  returned no configured variables on 2026-06-15.
- Vercel domain, preview/prod env, serverless runtime limits, and production
  database target are not verified.
- Prisma schema or database changes require a separate DB migration/review gate.
- Lemon Squeezy webhook secret, admin session secret, and license-server token
  changes require security review.

## Required Checks After Changes

Use only commands that still exist in the current `package.json`.

- Docs-only changes: `rg -n "Next.js|Prisma|Vercel|PostgreSQL|ignored/local-only|not verified" AGENTS.md docs README.md`
- API, dashboard, Prisma, or package changes: `pnpm lint`
- Build-sensitive changes: `pnpm build`
- Prisma-only changes: `pnpm db:generate`
- Database changes: validate against a local test DB with `pnpm db:push`,
  `pnpm db:seed`, and `pnpm db:verify`; production DB changes require approval.

If dependencies are missing, report that installation is required before running
checks. Do not substitute undocumented commands.

## Disallowed Actions

- Do not stage or commit unrelated dirty work.
- Do not commit `.next/`, `.vercel/`, `.env`, `.env.local`, `out/`, or
  `node_modules/`.
- Do not run `pnpm db:push`, production deploys, or webhook tests against real
  services without explicit user approval.
- Do not rename the repository, product identifiers, API routes, or env names as
  part of general cleanup.
- Do not present local-only files or unverified Vercel state as committed deploy
  facts.

## Final Report Format

When reporting work in this repository, include:

- Current branch and dirty-tree summary.
- Files changed by this task.
- Which facts are tracked, untracked, ignored/local-only, runtime verified, or
  not verified.
- Commands run and their results.
- Remaining risks, especially Vercel env, Prisma migration, webhook secret, and
  untracked implementation state.
