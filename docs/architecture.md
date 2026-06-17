# rustzen-cloud Architecture

Status: current architecture
Date: 2026-06-16

## Classification

`rustzen-cloud` is a Peripheral RustZen Cloud app: Next.js App Router + Prisma +
PostgreSQL intended for Vercel.

## Responsibility

The cloud surface owns:

- Admin dashboard for products, licenses, devices, orders, and versions.
- License activation backed by Prisma/PostgreSQL.
- Release metadata lookup for desktop clients.
- Lemon Squeezy webhook ingestion.
- Legacy proxy calls to an external license server when explicitly configured.

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
| Billing webhook | `src/app/api/webhooks/lemonsqueezy/route.ts` | source |
| Deployment link | `.vercel/` | ignored/local-only |

## API Contracts

These contracts are implemented by the route files listed below.

### `POST /api/licenses/activate`

File: `src/app/api/licenses/activate/route.ts`

Request body:

```json
{
  "license_key": "RZ-...",
  "device_id": "device-id",
  "product": "rustzen-clear",
  "device_name": "optional-name",
  "app_version": "optional-version"
}
```

`product` is required. RustZen desktop clients send this explicitly so license
keys are resolved against one product namespace.

Success response:

```json
{
  "token": "<opaque-license-token>",
  "status": {
    "plan": "pro",
    "is_active": true,
    "expires_at": null,
    "bound_device_count": 1
  }
}
```

This license API intentionally uses the client-facing snake_case field names and
error codes expected by RustZen desktop clients. Error responses include
`validation_failed`, `license_key_invalid`, `license_not_active`,
`license_not_found`, `device_not_found`, `invalid_token`,
`invalid_json`, `device_limit_reached`, `activation_conflict`, and
`license_service_misconfigured`.
`device_limit_reached` includes `detail.max_devices` so desktop clients can
show the configured binding limit.

### `GET /api/licenses/verify`

File: `src/app/api/licenses/verify/route.ts`

Requires `Authorization: Bearer <token>`. Returns
`{ "success": true, "status": { ... } }` when the token, license, and device
binding are valid. Tokens include the license expiration as JWT `exp`, so a
naturally expired token is rejected as `invalid_token`; inactive status is
returned when a still-valid token maps to a license that has been revoked or
otherwise made inactive in the database.

### `POST /api/licenses/refresh`

File: `src/app/api/licenses/refresh/route.ts`

Requires `Authorization: Bearer <token>`. Returns a refreshed token and current
status.

### `POST /api/licenses/deactivate`

File: `src/app/api/licenses/deactivate/route.ts`

Requires `Authorization: Bearer <token>`. Removes the current token device
binding and returns `{ "success": true, "message": "device deactivated" }`.

### `GET /api/licenses/health`

File: `src/app/api/licenses/health/route.ts`

Checks the local Prisma-backed license API database connection and returns
`{ "ok": true, "service": "licenses", "products": <count> }` when the query
succeeds. Database errors return `503` with `database_unavailable`.

## Legacy External Proxy

The `/api/ls/*` routes are legacy compatibility routes for a separate external
license server. They are not the default RustZen desktop-client contract.

### `POST /api/ls/activate`

File: `src/app/api/ls/activate/route.ts`

Passes the JSON request body to the external license server path
`/licenses/activate` through `src/lib/license-server.ts`. The helper uses
`RUSTZEN_LICENSE_SERVER_URL`, optional `RUSTZEN_LICENSE_SERVER_TOKEN`, and
`cache: 'no-store'`.

The local Prisma-backed license routes sign opaque bearer tokens with
`LICENSE_JWT_SECRET`. Tokens include the license key, product code, device id,
plan, token version, issue time, and expiration metadata. Production fails
closed with `license_service_misconfigured` when no signing secret is
configured. Desktop clients must treat returned tokens as opaque and must not
embed the signing secret.

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
`LEMONSQUEEZY_WEBHOOK_SECRET` and stores a `BillingEvent`. Idempotency uses
Lemon Squeezy's `meta.webhook_id` when present, then falls back to the order id
or a hash of the raw request body. The route creates a `License` for
`order_created` or `subscription_created` events only when
`custom_data.product` explicitly matches a known RustZen product and the
customer email can be resolved. The billing event write and license creation run
inside one Prisma transaction so webhook retries can still create the license if
the side effect failed before the event was committed. Invalid signed JSON
returns `invalid_json` instead of falling through to a framework error.

## Dashboard Flows

- `/` redirects to `/dashboard`.
- `/login` verifies `RUSTZEN_ADMIN_PASSWORD` and creates a signed cookie session.
- `/dashboard` links product, license, device, version, order, and local license
  API health surfaces. Orders currently route through the license view; there is
  no separate order or webhook-event dashboard page yet.
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
- Legacy `RUSTZEN_LICENSE_SERVER_URL` and bearer-token proxy behavior.
- `LICENSE_JWT_SECRET` token-signing behavior.
- Activation response shape consumed by desktop clients.
- Version metadata shape consumed by desktop update checks.

## Not Verified

- Local dev server or browser behavior.
- Vercel domain, env values, deployment output, or runtime limits.
- Production webhook delivery from Lemon Squeezy.
- Desktop client integration against these routes.
