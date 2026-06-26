# Rustzen Design System — Cloud Dashboard

> Brand & UI spec for the **cloud** admin dashboard (Next.js + Tailwind v4 + shadcn/ui).
> The **token system is shared** with the marketing site and the product GUI — see
> [`rustzen/app` design-system.md §1](../../app/docs/design-system.md) for the
> authoritative token definitions. This file restates the tokens for this repo and
> defines the dashboard-specific conventions.
>
> Status: v1 — token migration + admin-shell & overview restyle sample.

## 0. Strategy

The dashboard was a default slate shadcn install. This spec replaces the slate
palette with the **Zen Blue Glass** brand system: brand-blue accents, glass cards,
and a deep **zen-navy glass sidebar** (kept dark — it reads as a professional
"control plane" — but tinted blue, not dead slate). Light + dark mode supported.

## 1. Tokens (mirrors app §1)

Copied into `src/app/globals.css`. Key mappings to the shadcn variable names:

```css
:root {
  --background: var(--paper, #f7faff);
  --foreground: var(--ink,   #2f3e58);
  --card:       var(--surface, #ffffff);
  --card-foreground: var(--ink);
  --primary:        #2f3e58;  /* ink — not dead black */
  --primary-foreground: #ffffff;
  --secondary:      var(--brand-100, #e3edfd);
  --secondary-foreground: var(--brand-800, #244783);
  --muted:          #eef2f7;
  --muted-foreground: var(--ink-2, #60708a);
  --accent:         var(--brand-100, #e3edfd);   /* was teal */
  --accent-foreground: var(--brand-700, #2f63b0);
  --destructive:    #e85a5a;                      /* = danger */
  --border:         #e3edfd;
  --input:          #cfdcf2;
  --ring:           var(--brand-600, #3f7fd9);
  --radius:         14px;                         /* was 8px */

  /* zen-navy glass sidebar (kept dark) */
  --sidebar:                #0f1830;
  --sidebar-foreground:     #e8eef9;
  --sidebar-primary:        #77a8f7;              /* brand-400 active marker */
  --sidebar-primary-foreground: #0c1426;
  --sidebar-accent:         rgba(119,168,247,.14);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border:         rgba(119,168,247,.16);
}
```

Brand scale + safety + glass tiers + dark mode: identical to
[`app/docs/design-system.md` §1](../../app/docs/design-system.md). Copy that block
verbatim under `@theme inline` / `:root` / `.dark`.

## 2. Dashboard conventions

### 2.1 Admin shell

- **Sidebar** — zen-navy glass (`backdrop-blur`, brand-200 hairline borders), brand
  mark + "Rustzen Cloud / Control plane". Active item: brand-400 left marker (4px)
  + `--sidebar-accent` fill. Bottom: admin-only notice card + Sign out. Collapsible
  on desktop; sheet on mobile.
- **Topbar** — sticky glass (`bg-background/80 backdrop-blur`), page title +
  breadcrumb, right side: global search `⌘K`, theme toggle, sign out. A
  prod/staging env badge sits beside the title.
- **Content** — `max-w-[1440px]`, `px-5 py-6 lg:px-8 lg:py-8`, `space-y-6`.

### 2.2 Components

| Component | Spec |
|---|---|
| `StatCard` | Glass tier-1, icon chip (brand-600/12 bg, brand-600 icon), value 30px 700, optional mini sparkline (brand-400→brand-600 gradient) |
| `AdminSection` | Card with radius lg, header title + description, content padding 24px |
| `Badge` (status) | safe/caution/danger tokens; ACTIVE→safe, EXPIRED→caution, REVOKED→danger |
| `DataTable` | generic client table — search, column sort, pagination, empty state, row hover (`src/components/admin/data-table.tsx`) |
| `LicensesTable` / `DevicesTable` | client wrappers defining columns; copy-key button, status badge, confirm actions |
| `EmptyState` | dashed border, muted icon, title + CTA |
| `Skeleton` / `StatCardSkeleton` | brand shimmer; used as `<Suspense>` fallback on the overview |
| `ToasterProvider` / `useToast` | dependency-free toast surface; success/danger variants |
| `ConfirmAction` | modal gating destructive server actions (revoke/unbind); calls action via `useTransition` |
| `CopyButton` | clipboard copy + success toast |
| `ThemeToggle` | `useSyncExternalStore`-based, no deps; seeded pre-paint in root layout |

### 2.3 Page specs

**Overview** (`/dashboard`):
- Stat row: Licenses (with active count), Devices, Versions, Billing events — 4
  glass StatCards, each with a 30-day sparkline.
- Products card (glass): table → Product / Code / Licenses / Versions / Manage.
- Runtime card: API base URL health line + "Check license API health" button.
- API surface card: method badge + path + description rows.

**Licenses** (`/dashboard/licenses`):
- Filter bar: status (safe/caution/danger), product, free-text search.
- DataTable columns: key (mono, truncated, copy button) · product · status badge ·
  devices · limit · expires · actions (view devices, revoke → confirm, unbind →
  confirm).
- "Create license" → shadcn Dialog (replaces the current custom modal).

**Versions** (`/dashboard/versions`):
- Release manager: channel badge (stable/beta), "mark latest", publish form,
  version list with download counts.

## 3. Dark mode

`.dark` swaps paper/panel/surface to the navy ramp (app §1.6). The sidebar is
already dark, so in dark mode the whole shell becomes one continuous navy canvas
with glass panels floating on it — this is the intended premium look. Theme toggle
in the topbar; seeded from `prefers-color-scheme`; no new dependency (inline
no-FOUC script + `ThemeToggle` client component).

## 4. Roadmap

All phases shipped: token migration + sidebar/topbar/stat-card restyle (P0/P3),
plus DataTable (search/sort/paginate/copy), confirm dialogs, toasts, Suspense
skeletons, dark mode, and a real 14-day license-creation sparkline (P4). No new
dependencies were added — toast, confirm, skeleton, sparkline and theme toggle
are all dependency-free.

Remaining polish (not blocking): global `⌘K` search; density toggle on tables;
wire more StatCards to trend data; export (CSV) and bulk actions.
