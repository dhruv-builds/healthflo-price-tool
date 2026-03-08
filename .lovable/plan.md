

# Plan: CRM Module for HealthFlo

## Overview

Add a full CRM module alongside the existing Pricing tool. The app gets a module switcher in the top bar, new CRM routes, 7 new database tables, a storage bucket for file uploads, and modular CRM components organized under `src/components/crm/` and `src/pages/crm/`.

---

## 1. Database Schema (Migration)

**New tables:**

| Table | Key Columns | Notes |
|---|---|---|
| `crm_accounts` | id, name, account_type (enum: Hospital/Clinic/Doctor), owner_id (uuid), source (enum), referrer_name, geography, status (enum), website, notes, linked_client_id (FK → clients), created_by, updated_by, created_at, updated_at | Core entity |
| `crm_contacts` | id, account_id (FK), name, title, seniority, location, linkedin_url, phone, email, notes, created_by, created_at | Nested under account |
| `crm_opportunities` | id, account_id (FK), name, stage (enum: Prospecting→Won/Lost), owner_id, expected_value, expected_close_date, next_step, notes, created_by, updated_by, created_at, updated_at | Optional per account |
| `crm_activities` | id, account_id (FK), contact_id (FK nullable), opportunity_id (FK nullable), activity_type (enum: Meeting/Call/Demo/Email/Note), activity_date, title, notes, created_by, created_at | Timeline entries |
| `crm_tasks` | id, account_id (FK nullable), contact_id (FK nullable), opportunity_id (FK nullable), activity_id (FK nullable), title, description, assignee_id, due_date, priority (enum: Low/Med/High), status (enum: Open/InProgress/Done), created_by, created_at, updated_at | Follow-ups |
| `crm_documents` | id, account_id (FK), item_type (enum: file/link), title, url, file_path, description, created_by, created_at | Account-level docs/links |
| `crm_activity_attachments` | id, activity_id (FK), item_type (enum: file/link), title, url, file_path, created_by, created_at | Activity-level attachments |

**Enums:** `crm_account_type`, `crm_source`, `crm_account_status`, `crm_opp_stage`, `crm_activity_type`, `crm_task_priority`, `crm_task_status`, `crm_item_type`

**Storage bucket:** `crm-files` (public: false) with RLS policies for authenticated users.

**RLS:** All tables get policies scoped to authenticated users (SELECT/INSERT/UPDATE). DELETE restricted to admins on accounts. All use `auth.uid()` checks. This is tighter than the current permissive pricing table policies.

---

## 2. File Organization

```text
src/
├── types/
│   └── crm.ts                    # All CRM type definitions
├── hooks/
│   ├── useCrmAccounts.ts          # Account CRUD + filters
│   ├── useCrmContacts.ts          # Contact CRUD
│   ├── useCrmOpportunities.ts     # Opportunity CRUD
│   ├── useCrmActivities.ts        # Activity CRUD
│   ├── useCrmTasks.ts             # Task CRUD + filtered views
│   └── useCrmDocuments.ts         # Documents & attachments CRUD
├── pages/
│   └── crm/
│       ├── CrmHome.tsx            # Accounts list + metrics strip
│       ├── AccountDetail.tsx      # Tabbed account detail page
│       ├── TasksPage.tsx          # Global tasks view
│       └── ReportsPage.tsx        # Lightweight CRM reports
├── components/
│   └── crm/
│       ├── CrmLayout.tsx          # CRM shell with sub-nav
│       ├── AccountsTable.tsx      # Filterable accounts table
│       ├── AccountForm.tsx        # Create/Edit account modal
│       ├── ContactsList.tsx       # Contacts section
│       ├── ContactForm.tsx        # Contact modal
│       ├── OpportunitySection.tsx # Opportunity card/form
│       ├── ActivityTimeline.tsx   # Timeline display
│       ├── ActivityForm.tsx       # Log activity modal
│       ├── TasksList.tsx          # Tasks list component
│       ├── TaskForm.tsx           # Task modal
│       ├── DocumentsSection.tsx   # Docs/links section
│       ├── DocumentForm.tsx       # Add file/link modal
│       └── PricingLinkSelector.tsx # Link pricing client picker
```

---

## 3. Routing & Module Switching

**TopBar changes:**
- Add a segmented control (Pricing | CRM) to the left section of `TopBar.tsx`, next to the HealthFlo branding.
- When in CRM mode, hide pricing-specific controls (currency toggle, FX rate, export, presentation mode). Show CRM-specific nav instead.
- Alternatively, the module switcher lives at the app level and each module has its own top bar. Given the current architecture where `TopBar` is inside `Index.tsx`, the cleaner approach is:

**App.tsx route additions:**
```
/crm              → CrmHome (accounts list)
/crm/accounts/:id → AccountDetail
/crm/tasks        → TasksPage
/crm/reports      → ReportsPage
```

All wrapped in existing `ProtectedRoute`.

**Module switcher approach:** Add a simple tab/segmented control in the top bar area. Clicking "Pricing" navigates to `/`, clicking "CRM" navigates to `/crm`. Both modules share the auth shell but have independent layouts.

---

## 4. Key Implementation Details

**Account Management:**
- Filterable table with search, type/status/owner/source filters
- Conditional referrer_name field when source = "Referral"
- Website URL validation via zod
- Status: Active, Dormant, Won Customer, Lost, Archived
- Owner dropdown populated from profiles table

**Contacts:** Simple list under account detail with modal form. Name required, all else optional.

**Opportunities:** Card/inline section on account detail. Stage pipeline: Prospecting → Discovery → Demo → Proposal → Pricing → Negotiation → Won → Lost. Won/Lost are terminal.

**Activity Timeline:** Reverse chronological. Each activity can link to a contact, opportunity, and have inline file/link attachments. "Save & Create Task" secondary action on the form.

**Tasks:** Global `/crm/tasks` page with tab filters (My Tasks, All, Overdue, Due This Week). Also shown contextually on account detail.

**Documents/Links:** Account-level section. Links always work. File upload gated on storage bucket availability — if bucket creation fails, show links only with a message.

**Pricing Linkage:** `linked_client_id` FK on `crm_accounts` → `clients.id`. A selector component queries existing pricing clients. "Open in Pricing" navigates to `/` and sets the active client (via URL param or context).

**Reports:** KPI cards (accounts by type, open opps by stage, tasks due today/this week, stale opps). Simple queries, no charts needed for MVP.

---

## 5. What Stays Unchanged

- All existing pricing routes, components, and behavior
- Auth flow, approval gating, role system
- `AuthContext`, `PendingApproval`, `AdminUsers`
- Existing database tables (`clients`, `versions`, `profiles`, `user_roles`)
- Presentation mode toggle
- Export to Excel

---

## 6. Build Sequence

Given the size, this will be implemented across multiple steps:

1. **Database migration** — all 7 tables, enums, storage bucket, RLS policies
2. **Types + hooks** — CRM type definitions and all data hooks
3. **Module switcher + CRM routes + layout shell**
4. **Accounts list + account form**
5. **Account detail page + contacts + opportunity**
6. **Activity timeline + activity form**
7. **Tasks page + task form**
8. **Documents/links + activity attachments**
9. **Pricing client linking**
10. **Reports page**
11. **Empty/loading/error states polish**

This is a large build. Implementation will proceed step by step, starting with the database schema and core scaffolding.

