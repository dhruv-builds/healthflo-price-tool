# Architecture

## High-level

HealthFlo is a single-page React 18 + Vite 5 + TypeScript application backed by Lovable Cloud (managed Supabase: Postgres, Auth, Storage, Edge Functions). It serves two integrated modules — **Pricing** and **CRM** — behind a unified auth + approval layer.

```text
┌──────────────────────────────────────────────────────┐
│                    React SPA (Vite)                   │
│                                                       │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────┐  │
│  │ Pricing (/)   │  │ CRM (/crm/*)  │  │ Admin    │  │
│  └───────┬───────┘  └───────┬───────┘  └─────┬────┘  │
│          │                  │                │       │
│          └─────── AuthContext / React Query ─┘       │
└──────────────────────────┬───────────────────────────┘
                           │
                  Supabase JS Client
                           │
┌──────────────────────────┴───────────────────────────┐
│  Lovable Cloud: Postgres + Auth + Storage + Edge Fns │
└──────────────────────────────────────────────────────┘
```

## Modules

### Pricing (`/`)

A SaaS pricing calculator with 6 discount tiers (Base, 10%, 20%, 30%, 40%, 50%).

- Calculation engine in `src/utils/` (pricing math, overage analysis, unit economics).
- Dual-currency (INR / USD) via `useExchangeRate` hook (live FX with manual override).
- Excel export: `src/utils/exportExcel.ts` (SheetJS).
- Versions stored as JSONB rows in the `versions` table, scoped to a client.
- **Presentation Mode**: admin-only toggle in `src/pages/Index.tsx` that hides cost/margin columns during demos.
- Templates (e.g. *Jeena Seekho*, *India General*) in `src/utils/templateDefaults.ts`.

### CRM (`/crm`)

Lightweight relationship CRM for hospitals, clinics, and doctors.

- Entities: `crm_accounts`, `crm_contacts`, `crm_opportunities`, `crm_activities`, `crm_tasks`, `crm_documents`.
- Account types: Hospital / Clinic / Doctor.
- Opportunity pipeline: 8 stages (Prospecting → Won / Lost).
- Activity types: Meeting, Call, Demo, Email, Note (with attachments).
- Tasks: priority (Low/Medium/High), status, due date, assignee.
- Reports page surfaces stale-account detection (>14 days idle) and pipeline visibility.

### Admin

User approval and role management page, gated to `admin` role only.

## Cross-module integration

CRM accounts can link to Pricing clients via `crm_accounts.linked_client_id`. Navigating from CRM to Pricing uses the query parameter:

```text
/?clientId={uuid}
```

`src/pages/Index.tsx` reads `clientId` from the URL on mount and loads that client's versions automatically.

## Routing

Defined in `src/App.tsx` using `react-router-dom` v6. All routes are wrapped by `AuthContext` and an approval gate.

| Route | Component | Access |
|---|---|---|
| `/auth` | `src/pages/Auth.tsx` | Public |
| `/` | `src/pages/Index.tsx` | Authenticated + approved |
| `/crm` | CRM accounts list | Authenticated + approved |
| `/crm/accounts/:id` | `src/pages/crm/AccountDetail.tsx` | Authenticated + approved |
| `/crm/reports` | CRM reports dashboard | Authenticated + approved |
| `/admin` | User management | `admin` only |

## State management

- **Server state**: TanStack React Query v5. One hook per entity (e.g. `useClients`, `useCrmAccounts`, `useCrmContacts`, `useCrmOpportunities`).
- **Auth state**: `src/contexts/AuthContext.tsx` exposes `session`, `user`, `role`, `approved`, `loading`.
- **Local UI state**: `useState` / `useReducer` inside components.

## Key shared components

- `src/components/GlobalHeader.tsx` — app header with branding, nav, user menu.
- `src/components/crm/StatusBadgeDropdown.tsx` — interactive status badge used in Accounts table and Account Detail header. Wraps `useUpdateAccount` mutation; uses `e.stopPropagation()` so it does not trigger row navigation.
- `src/components/ui/dialog.tsx` — shadcn dialog, customized with `max-h-[90vh] overflow-y-auto` on `DialogContent` so tall forms scroll instead of clipping.

## Project structure

| Directory | Purpose |
|---|---|
| `src/pages/` | Route-level pages |
| `src/components/pricing/` | Pricing UI |
| `src/components/crm/` | CRM UI |
| `src/components/ui/` | shadcn/ui primitives |
| `src/hooks/` | Data hooks (React Query) |
| `src/contexts/` | AuthContext |
| `src/types/` | Domain types |
| `src/utils/` | Calculation engine, exporters, templates |
| `src/integrations/supabase/` | Auto-generated Supabase client + types (do not edit) |
| `supabase/` | Migrations, `config.toml`, edge function source |
| `docs/` | This documentation pack |
