# RustZen Cloud

RustZen Cloud is the admin dashboard and cloud API surface for RustZen macOS products.

## Scope

- Product, license, device, order, and version management dashboard
- License activation and version-check API routes
- Creem checkout and webhook handling for Rustzen Clear Pro
- Legacy Lemon Squeezy webhook handling
- License server proxy endpoints
- PostgreSQL access through Prisma

Rustzen Clear Pro is sold through Creem as an annual subscription at $10/year.
The live product id is `prod_4Wa3YyJe3bn8hNuotPlSYj`.

The public product website lives in [`rustzen/app`](https://github.com/rustzen/app).

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Vercel

## Development

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm db:generate
pnpm db:verify
pnpm lint
pnpm build
```

## Environment

Copy `.env.example` to `.env.local` and configure the database, dashboard auth,
license server, Creem API key, and webhook secrets.

For local database validation, PostgreSQL 17 from Homebrew was used with a local
`rustzen_cloud_test` database.
