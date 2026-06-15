# rustzen-cloud Architecture

Status: current architecture
Date: 2026-06-15

## Classification

`rustzen-cloud` is a Peripheral RustZen Cloud app: Next.js App Router + Prisma +
PostgreSQL intended for Vercel.

## Responsibility

The cloud surface owns:

- Admin dashboard for products, licenses, devices, orders, and versions.
- License activation backed by Prisma/PostgreSQL.
- Release metadata lookup for desktop clients.
- Lemon Squeezy webhook ingestion.
- Optional proxy calls to an external license server.

It must not own:

- Local cleanup data from RustZen Clear.
- Local clipboard history from RustZen Clipboard.
- Tauri updater signing, bundle identity, or app data directories.
- Linux `/opt` release bundles, systemd units, or Rust service install scripts.

## Layer Map

| Layer | Files | Status |
| --- | --- | --- |
| Presentation | `src/app/login/page.tsx`, `src/app/dashboard/**/page.tsx`, `src/app/globals.css` | source |
| API routes | `src/app/api/**/route.ts` | source |
| Auth/session | `src/lib/auth.ts` | source |
| Database access | `src/lib/prisma.ts`, `prisma/schema.prisma` | source |
| External license server proxy | `src/lib/license-server.ts`, `src/app/api/ls/**` | source |
| Billing webhook | `src/app/api/webhooks/lemonsqueezy/route.ts` | source |
| Deployment link | `.vercel/` | ignored/local-only |

## API Contracts

These contracts are implemented by the route files listed below.

### `POST /api/licenses/activate`

File: `src/app/api/licenses/activate/route.ts`

Request body:

```json
{
  "product": "rustzen-clear",
  "license_key": "RZ-...",
  "device_id": "device-id",
  "device_name": "optional-name",
  "app_version": "optional-version"
}
```

Success response:

```json
{
  "valid": true,
  "product": "rustzen-clear",
  "plan": "pro",
  "expires_at": null,
  "max_devices": 3
}
```

Error responses include `{ "valid": false, "error": "Invalid request" }`,
`{ "valid": false, "error": "Invalid license" }`, and
`{ "valid": false, "error": "Device limit reached" }`.

### `POST /api/ls/activate`

File: `src/app/api/ls/activate/route.ts`

Passes the JSON request body to the external license server path
`/licenses/activate` through `src/lib/license-server.ts`. The helper uses
`RUSTZEN_LICENSE_SERVER_URL`, optional `RUSTZEN_LICENSE_SERVER_TOKEN`, and
`cache: 'no-store'`.

### `GET /api/ls/health`

File: `src/app/api/ls/health/route.ts`

Calls the external license server path `/health` and returns the helper result.
The HTTP status is `200` for successful upstream responses and `502` otherwise.

### `GET /api/versions`

File: `src/app/api/versions/route.ts`

Query parameters:

- `product`: required product code.
- `platform`: optional, defaults to `macos`.

Returns the newest `AppVersion` by `publishedAt` for the product/platform.
When no version exists, the response is `{ "product": "...", "platform": "...",
"version": null }`.

### `POST /api/webhooks/lemonsqueezy`

File: `src/app/api/webhooks/lemonsqueezy/route.ts`

Verifies the `x-signature` HMAC SHA-256 signature using
`LEMONSQUEEZY_WEBHOOK_SECRET`, stores a `BillingEvent`, and creates a `License`
for `order_created` or `subscription_created` events when the product and email
can be resolved.

## Dashboard Flows

- `/` redirects to `/dashboard`.
- `/login` verifies `RUSTZEN_ADMIN_PASSWORD` and creates a signed cookie session.
- `/dashboard` links product, license, device, version, order, and license-server
  health surfaces.
- `/dashboard/licenses` creates/revokes licenses and unbinds devices.
- `/dashboard/versions` upserts release metadata by product/version/platform.

## Data Boundary

Prisma models:

- `Product`: RustZen product catalog entry.
- `License`: license key, status, plan, provider order, limits, expiration.
- `LicenseDevice`: activated device identity and last-seen metadata.
- `AppVersion`: release metadata for update checks.
- `BillingEvent`: webhook/event archive.

The seed creates `rustzen-clear` and `rustzen-clipboard` products. Local
`pnpm db:push`, `pnpm db:seed`, and `pnpm db:verify` passed against Homebrew
PostgreSQL database `rustzen_cloud_test` on 2026-06-15.

## Security And Review Gates

The following changes require explicit review before deploy or commit:

- Vercel project/team/domain, preview/prod env, and runtime target changes.
- Prisma schema, generated client, or database migration changes.
- `LEMONSQUEEZY_WEBHOOK_SECRET` verification logic or webhook payload mapping.
- `RUSTZEN_ADMIN_SECRET`, `RUSTZEN_ADMIN_PASSWORD`, session cookie behavior, or
  admin authorization rules.
- `RUSTZEN_LICENSE_SERVER_URL` and bearer-token proxy behavior.
- `RUSTZEN_LICENSE_SECRET` if it becomes wired; current `src/` does not
  reference it.
- Activation response shape consumed by desktop clients.
- Version metadata shape consumed by desktop update checks.

## Not Verified

- Local dev server or browser behavior.
- Vercel domain, env values, deployment output, or runtime limits.
- Production webhook delivery from Lemon Squeezy.
- Desktop client integration against these routes.
