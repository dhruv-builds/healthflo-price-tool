# UX Flows

## Auth flow

1. User lands on `/auth` (`src/pages/Auth.tsx`).
2. Signs up via email/password or Google.
3. Email/password signups must verify email before sign-in.
4. After sign-in, `AuthContext` loads `profiles.approved`.
   - If `approved = false` → "pending approval" view.
   - If `approved = true` → redirect to `/`.
5. Admin approves the user from `/admin`. User can now access the app.

## Pricing flow

1. Land on `/` — pricing dashboard.
2. Select or create a **Client** from the sidebar.
3. Pick a **Template** (or start blank).
4. Configure base price, included visits, overage rate, implementation costs.
5. Live tier table renders 6 discount tiers (Base / 10% / 20% / 30% / 40% / 50%).
6. Toggle currency (INR / USD) — uses `useExchangeRate` hook.
7. Admin-only: view **Unit Economics** tab (cost, revenue, profit, margin %).
8. Admin-only: toggle **Presentation Mode** to hide cost-sensitive columns when screen-sharing.
9. Save as a **Version** (stored in `versions` table as JSONB).
10. Export to Excel via toolbar button (`src/utils/exportExcel.ts`).

### Cross-module entry from CRM

Clicking "Open in Pricing" from a CRM account navigates to `/?clientId={uuid}`. `src/pages/Index.tsx` auto-loads that client's most recent version.

## CRM flows

### Accounts list (`/crm`)
- Sortable / filterable table of accounts.
- **Status column** uses `StatusBadgeDropdown` — click the badge to change status inline. Dropdown trigger looks like the existing badge with a small caret. Updates persist via `useUpdateAccount`, invalidate React Query cache, and surface success/error via `sonner` toast.
- Row click navigates to account detail.

### Account detail (`/crm/accounts/:id`)
- Header shows account name, type, and the same `StatusBadgeDropdown` for inline status edits.
- Tabs: **Overview**, **Contacts**, **Opportunities**, **Activities**, **Tasks**, **Documents**.
- Each tab supports CRUD via dialogs (shadcn `Dialog`, scrollable via `max-h-[90vh] overflow-y-auto`).
- "Open in Pricing" button appears when `linked_client_id` is set.

### Activities
- Log a meeting / call / demo / email / note with timestamp, summary, and optional attachment / link.
- Timeline view sorted by `occurred_at` desc.

### Tasks
- Create with title, priority, status, due date, assignee.
- Status can be edited inline. Overdue tasks are visually flagged.

### Documents
- Upload files (stored in `crm-files` bucket) or attach external URLs.
- Scoped to the account.

### Reports (`/crm/reports`)
- **Stale accounts**: accounts with no activity in >14 days.
- **Pipeline**: opportunities grouped by stage with total expected value.

## Admin flow (`/admin`)
- Lists all users with email, full name, approval status, and role.
- Toggle approval. Assign / change role.
- Admin-only route — redirects non-admins.

## Toast conventions

- Mutations (create/update/delete) → `sonner` toast on success and error.
- Destructive actions → confirmation dialog before mutation.

---

## Workflow flows (added 2026-04-27)

### Initialize workflow
1. Open a CRM account → **Workflow** tab.
2. If no workflow exists, click **Initialize Workflow** → creates a `workflow_records` row at stage `Lead`, owned by current user, optionally pre-linked to the account's `linked_client_id`. Default checklist seeded.

### Operate on a workflow
- **Change Stage** — opens `WorkflowStageModal` with target stage + optional reason. Soft warning if required current-stage checklist items are incomplete. On confirm: writes `workflow_stage_history`, updates `stage` and `stage_entered_at`.
- **Next Action** — inline edit (title + datetime).
- **Blocker** — inline edit (type + reason; reason required by DB trigger). Clear via header button.
- **Pricing Reference** — pick a version from the linked pricing client; opens Pricing via `/?clientId=<uuid>`.
- **Checklist** — toggle items; `*` marks required.
- **Create Task** — opens existing `TaskForm` scoped to the account (CRM Tasks remain the system of record for assigned work).

### Workflow Home
- Views: **All**, **My Queue** (owner = current user), **Needs Attention**, **Board** (Kanban by stage).
- Stage filter on non-board views.
- Summary cards: Active Workflows, Needs Attention, Blocked, Ready to Move.

### Needs Attention rules (deterministic)
A workflow is flagged when any of: next action overdue, no next action set, `is_blocked = true`, stage stale > 14 days, or stage requires pricing reference (`Pricing` / `Negotiation` / `Pricing Agreement`) and `reference_version_id` is null.
