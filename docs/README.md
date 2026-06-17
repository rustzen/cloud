# rustzen-cloud Docs

Status: current project docs
Date: 2026-06-16
Project type: Peripheral RustZen Cloud

These docs record the current repository facts for `rustzen-cloud` and separate
source files from ignored local runtime/deploy artifacts.

## Read First

1. `../AGENTS.md` - task rules, fact boundary, commands, and deploy constraints.
2. `project-map.md` - current files, commands, routes, and high-risk areas.
3. `architecture.md` - candidate architecture and API contract map.
4. `deployment.md` - Vercel, Prisma, env, and local-only boundary.

## Current Boundary

- source: `README.md`, `.env.example`, `.gitignore`, `AGENTS.md`, `docs/`,
  `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `prisma/`,
  `scripts/`, `src/`, `tsconfig.json`, `eslint.config.mjs`, `next-env.d.ts`
- modified tracked during this standardization pass:
  `.env.example`, `docs/README.md`, `docs/architecture.md`,
  `docs/deployment.md`, `docs/project-map.md`,
  `src/app/api/licenses/activate/route.ts`
- untracked source candidates during this standardization pass:
  `src/app/api/licenses/verify/route.ts`,
  `src/app/api/licenses/refresh/route.ts`,
  `src/app/api/licenses/deactivate/route.ts`,
  `src/app/api/licenses/health/route.ts`, `src/lib/license-api.ts`
- ignored/local-only: `.next/`, `.vercel/`, `node_modules/`
- ignored local secret/runtime env: `.env.local`, `.env`, `.env.*.local`
- verified locally on 2026-06-15: `pnpm db:generate`, `pnpm db:push`,
  `pnpm db:seed`, `pnpm db:verify`
- verified locally on 2026-06-16: `pnpm lint`, `pnpm build`

Vercel project linkage exists locally, but `vercel env ls` returned no configured
environment variables on 2026-06-15. Production deploy/env state remains not
verified.
