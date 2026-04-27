# Technical Debt & Known Risks

Items here are deliberate trade-offs or known gaps. Update this file when items are resolved or new ones are discovered.

## Database

- **Missing FK constraints**: Most CRM relationships (e.g. `crm_contacts.account_id` → `crm_accounts.id`) are application-enforced, not declared as DB-level foreign keys. **Risk:** orphaned rows on delete. **Fix path:** add FK constraints with `ON DELETE CASCADE` or `SET NULL` in a migration.
- **No DB-level uniqueness on some natural keys** (e.g. account name + city). Application code dedupes best-effort.

## Frontend consistency

- **Dual toast systems** in use:
  - `sonner` (newer, used by most CRM flows)
  - shadcn `useToast` (older, used by some pricing flows)
  - **Decision:** standardize on `sonner` over time; do not introduce new `useToast` calls.
- **Mixed form handling**:
  - Most newer forms use `react-hook-form` + Zod.
  - Some older dialogs use raw `useState`.
  - **Decision:** new forms must use `react-hook-form` + Zod.

## Feature gaps

- **`crm_activity_attachments`** table exists but no UI exists to upload or list attachments per activity. Currently activity attachments are handled via the same `crm-files` bucket but not surfaced relationally.
- **No password reset flow** in `Auth.tsx`. Users who forget their password must contact an admin.
- **No bulk operations** in the CRM accounts table (bulk status change, bulk assign, bulk delete).
- **No audit log** for CRM mutations.

## Performance

- React Query default `staleTime` is used everywhere. For large lists (accounts, opportunities) this may cause more refetches than necessary. Consider per-query `staleTime` tuning.
- Supabase client queries default to a 1000-row limit. Lists do not yet paginate — fine at current data volume but a future risk.

## Security

- Client-side role checks are UX-only. RLS is the source of truth — verify any new table has appropriate policies before shipping.
- Storage bucket `crm-files` is private; ensure new upload paths use signed URLs, never public URLs.

## Documentation

- This `/docs` pack and `CHANGELOG.md` must be kept current. See `/docs/README.md` for the maintenance rule.

---

## Workflow module — known gaps (2026-04-27)

- **Pricing first-save linking prompt** not yet wired. Plan: trigger after the first version save for a brand-new pricing client; offer Link / Create / Skip.
- **Seed utility & seed-review surface** not yet built. `workflow_records.seed_confidence` and `seed_notes` columns exist for when this lands.
- **Stage suggestions UI** not exposed yet. Table (`workflow_stage_suggestions`) and enum exist; no generator or accept/dismiss UI.
- **Workflow collaborators UI** not built. Table exists; add/remove flow pending.
- **No FK between `workflow_records.linked_client_id` and `clients.id`** (consistent with the existing CRM no-FK convention). Validate in code if this becomes a source of bugs.
- **No analytics events** wired for workflow_* actions yet.
