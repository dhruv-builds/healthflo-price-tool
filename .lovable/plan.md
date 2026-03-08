

# CRM Module — Implementation Plan

## Architecture Decisions

**CRM → Pricing navigation:** URL query parameter `/?clientId={uuid}`. `Index.tsx` reads `clientId` from `useSearchParams` and sets `activeClientId`. Deterministic, stateless, shareable.

**Pricing linkage:** Account-level only via `linked_client_id` FK on `crm_accounts` → `clients.id`. No linkage on opportunities or other entities.

**`last_activity_at` strategy:** Denormalized column on `crm_accounts`, updated by a Postgres trigger on `crm_activities` INSERT. Stale opportunities = non-terminal stage + account `last_activity_at < now() - 14 days` (or null).

**RLS approach:** All CRM tables use a `SECURITY DEFINER` function `is_approved_user(uuid)` that checks `profiles.approved = true`. This ensures only approved users access CRM data — not just authenticated.

**Delete/archive behavior:**
- Accounts: soft-archive via status = 'Archived'; hard delete admin-only (cascades children)
- Contacts, activities, opportunities, tasks, documents, attachments: hard delete by creator or admin
- All cascades via FK `ON DELETE CASCADE`

**File uploads:** Create `crm-files` storage bucket. Links always work. File upload UI checks bucket availability and disables gracefully if unavailable.

**Indexes:** On all FK columns, filter columns (type, status, stage, priority, assignee, owner, due_date), and `last_activity_at`.

---

## Database Migration (Single migration)

**8 enums:**
- `crm_account_type`: Hospital, Clinic, Doctor
- `crm_source`: Founder Network, Outbound, Referral, Inbound, Partner, Event, Existing Relationship
- `crm_account_status`: Active, Dormant, Won Customer, Lost, Archived
- `crm_opp_stage`: Prospecting, Discovery, Demo, Proposal, Pricing, Negotiation, Won, Lost
- `crm_activity_type`: Meeting, Call, Demo, Email, Note
- `crm_task_priority`: Low, Medium, High
- `crm_task_status`: Open, In Progress, Done
- `crm_item_type`: file, link

**7 tables** with `created_by`, `updated_by` (where applicable), timestamps, proper FKs with `ON DELETE CASCADE`.

**1 helper function:** `is_approved_user(uuid)` — `SECURITY DEFINER`, checks `profiles.approved`.

**1 trigger:** On `crm_activities` INSERT → update parent `crm_accounts.last_activity_at`.

**RLS policies:** All tables: SELECT/INSERT/UPDATE for approved users. DELETE on accounts for admins only. DELETE on other entities for creator or admin.

**Storage bucket:** `crm-files` with authenticated-user RLS on `storage.objects`.

**~15 indexes** on FK and filter columns.

---

## File Organization

```
src/types/crm.ts
src/hooks/useCrmAccounts.ts
src/hooks/useCrmContacts.ts
src/hooks/useCrmOpportunities.ts
src/hooks/useCrmActivities.ts
src/hooks/useCrmTasks.ts
src/hooks/useCrmDocuments.ts
src/pages/crm/CrmHome.tsx
src/pages/crm/AccountDetail.tsx
src/pages/crm/TasksPage.tsx
src/pages/crm/ReportsPage.tsx
src/components/crm/CrmLayout.tsx
src/components/crm/AccountsTable.tsx
src/components/crm/AccountForm.tsx
src/components/crm/ContactsList.tsx
src/components/crm/ContactForm.tsx
src/components/crm/OpportunitySection.tsx
src/components/crm/ActivityTimeline.tsx
src/components/crm/ActivityForm.tsx
src/components/crm/TasksList.tsx
src/components/crm/TaskForm.tsx
src/components/crm/DocumentsSection.tsx
src/components/crm/DocumentForm.tsx
src/components/crm/PricingLinkSelector.tsx
```

---

## Routing Changes

**App.tsx** adds:
- `/crm` → `CrmHome`
- `/crm/accounts/:id` → `AccountDetail`
- `/crm/tasks` → `TasksPage`
- `/crm/reports` → `ReportsPage`

All wrapped in existing `ProtectedRoute`.

**TopBar.tsx** gets a segmented control (Pricing | CRM) next to the HealthFlo branding. When on `/crm/*`, pricing-specific controls (currency, FX, export, presentation mode) are hidden. CRM sub-nav (Accounts, Tasks, Reports) shown instead.

**Index.tsx** reads `?clientId=` from URL search params to auto-select a pricing client when navigating from CRM.

---

## Build Phases

### Phase 1: Database + Types + Hooks
- Single SQL migration with all enums, tables, trigger, indexes, RLS, storage bucket
- `src/types/crm.ts` — TypeScript types/enums
- All 6 `useCrm*.ts` hooks with React Query CRUD

### Phase 2: Module Switcher + Routes + Layout
- TopBar segmented control
- CRM routes in App.tsx
- CrmLayout shell with sub-nav
- Index.tsx `?clientId=` support

### Phase 3: Accounts + Contacts
- CrmHome with metrics strip + filterable accounts table
- AccountForm dialog (zod validation, conditional referrer_name)
- AccountDetail page shell with tabs
- ContactsList + ContactForm

### Phase 4: Opportunities + Activities
- OpportunitySection (inline card/form, stage pipeline)
- ActivityTimeline + ActivityForm (with inline attachment/link display)
- "Save & Create Task" secondary action

### Phase 5: Tasks + Documents
- TasksPage (global, filtered views: My/All/Overdue/Due This Week)
- TaskForm dialog
- DocumentsSection + DocumentForm (links mandatory, file upload conditional)
- Activity-level attachments

### Phase 6: Pricing Linkage + Reports
- PricingLinkSelector (dropdown of existing `clients`)
- "Open in Pricing" button → `/?clientId={id}`
- ReportsPage (KPI cards: accounts by type, opps by stage, due tasks, stale opps, recent activity)

### Phase 7: Polish
- Empty, loading, error states across all CRM surfaces
- Pricing module regression check

---

## What Stays Unchanged
- All pricing routes, components, behavior (`/`, `/auth`, `/admin/users`)
- Auth flow, approval gating, role system, `AuthContext`
- Existing tables (`clients`, `versions`, `profiles`, `user_roles`)
- Presentation mode, export, currency toggle

