# Rustzen Cloud

Rustzen Cloud is the admin dashboard and cloud API surface for Rustzen macOS products.

## Scope

- Product, license, device, order, and version management dashboard
- License activation and version-check API routes
- Billing provider checkout and webhook handling for Rustzen Clear Pro
- Legacy Lemon Squeezy webhook handling
- License server proxy endpoints
- PostgreSQL access through Prisma



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
license server, Billing provider API key, and webhook secrets.

For local database validation, PostgreSQL 17 from Homebrew was used with a local
`rustzen_cloud_test` database.
