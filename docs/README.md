# rustzen-cloud Docs

Status: current project docs
Date: 2026-06-15
Project type: Peripheral RustZen Cloud

These docs record the current repository facts for `rustzen-cloud` and separate
source files from ignored local runtime/deploy artifacts.

## Read First

1. `../AGENTS.md` - task rules, fact boundary, commands, and deploy constraints.
2. `project-map.md` - current files, commands, routes, and high-risk areas.
3. `architecture.md` - candidate architecture and API contract map.
4. `deployment.md` - Vercel, Prisma, env, and local-only boundary.

## Current Boundary

- tracked: `README.md`
- modified tracked: `README.md`
- ignored/local-only: `.next/`, `.vercel/`, `node_modules/`
- ignored local secret/runtime env: `.env.local`, `.env`, `.env.*.local`
- verified locally on 2026-06-15: `pnpm db:generate`, `pnpm db:push`,
  `pnpm db:seed`, `pnpm db:verify`, `pnpm lint`, `pnpm build`

Vercel project linkage exists locally, but `vercel env ls` returned no configured
environment variables on 2026-06-15. Production deploy/env state remains not
verified.
