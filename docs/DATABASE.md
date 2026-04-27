# Database

Backend is Lovable Cloud (managed Supabase Postgres). Schema is managed via migrations in `supabase/migrations/`. The Supabase JS client is initialized in `src/integrations/supabase/client.ts` (auto-generated, do not edit). Generated types live in `src/integrations/supabase/types.ts` (auto-generated, do not edit).

## Tables (public schema)

### `profiles`
Mirrors `auth.users` for application-readable user info plus an approval flag.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | matches `auth.users.id` |
| `email` | text | |
| `full_name` | text | |
| `approved` | boolean | gate for accessing the app |
| `created_at` | timestamptz | |

### `user_roles`
Roles are stored separately from `profiles` (security best practice — prevents privilege escalation).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | references `auth.users.id` |
| `role` | enum `app_role` | `admin` \| `employee` |

Role checks use a `SECURITY DEFINER` function `public.has_role(_user_id uuid, _role app_role)` to avoid recursive RLS.

### Pricing — `versions`
Saved pricing scenarios per client.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `client_id` | uuid | logical link to a client row |
| `name` | text | version label |
| `data` | jsonb | full pricing model snapshot |
| `created_by` | uuid | |
| `created_at` | timestamptz | |

### CRM tables

| Table | Purpose |
|---|---|
| `crm_accounts` | Hospitals, clinics, doctors |
| `crm_contacts` | People belonging to an account |
| `crm_opportunities` | Deals in pipeline |
| `crm_activities` | Meetings, calls, demos, emails, notes |
| `crm_tasks` | Assignable tasks with due dates |
| `crm_documents` | Files / links attached at the account level |
| `crm_activity_attachments` | Attachment records for activities (UI not yet implemented — see TECH_DEBT) |

#### `crm_accounts`
Key columns: `id`, `name`, `type` (`crm_account_type`), `status` (`crm_account_status`), `source`, `city`, `state`, `country`, `owner_id`, `linked_client_id`, `created_at`, `updated_at`.

`linked_client_id` is the bridge to the Pricing module.

#### `crm_opportunities`
Key columns: `id`, `account_id`, `name`, `stage` (`crm_opp_stage`), `expected_value`, `currency`, `expected_close_date`, `owner_id`, `created_at`, `updated_at`.

## Enums

| Enum | Values |
|---|---|
| `app_role` | `admin`, `employee` |
| `crm_account_type` | `hospital`, `clinic`, `doctor` |
| `crm_account_status` | `active`, `prospect`, `inactive`, `lost` (extend per migrations) |
| `crm_opp_stage` | 8 stages: `prospecting` → `qualification` → `discovery` → `proposal` → `negotiation` → `won` / `lost` (and intermediates) |
| `crm_activity_type` | `meeting`, `call`, `demo`, `email`, `note` |
| `crm_task_priority` | `low`, `medium`, `high` |
| `crm_task_status` | `todo`, `in_progress`, `done` |

## Row-Level Security (RLS)

RLS is enabled on every public table. Policies use `auth.uid()` and `public.has_role(...)` to enforce:

- Authenticated + approved users can read/write their own data.
- `admin` users can read/write all rows including unit economics, user roles, and approvals.
- `employee` users cannot read cost / margin columns (enforced at the query layer in pricing).

## Foreign keys

Most relationships are **application-enforced**, not declared as DB-level foreign keys. This is a known risk — see [TECH_DEBT.md](./TECH_DEBT.md).

## Storage buckets

| Bucket | Visibility | Used for |
|---|---|---|
| `crm-files` | Private | Account-level documents and activity attachments |

Access is gated by RLS policies that check the requesting user's role and ownership.

## Edge functions

Function source lives in `supabase/functions/`. Each function has its own folder with `index.ts`. Edge functions are deployed automatically by Lovable Cloud.

## Realtime

Not currently enabled on any table. To enable, the table must be added to the `supabase_realtime` publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>;
```
