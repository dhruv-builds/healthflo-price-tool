# Workflow Module — Additive Build Plan

A new operational layer over existing CRM accounts. Workflow stage is tracked **separately** from the existing `crm_accounts.status`. CRM Tasks remain unchanged. Pricing is untouched except for one small first-save linking prompt.

---

## What gets built

### New route & nav
- `/crm/workflows` — Workflow Home (List · Board · My Queue · Needs Attention)
- New nav item **"Workflow"** added to `CrmLayout.tsx` (icon: `Workflow` from lucide), placed between Tasks and Reports.
- New section/tab **"Workflow"** embedded in `AccountDetail.tsx` (added as a new Tabs tab, default to it when present).

### New pages / components
| File | Purpose |
|---|---|
| `pages/crm/WorkflowPage.tsx` | Workflow Home with view tabs + filter bar |
| `components/crm/WorkflowList.tsx` | Dense table view (account, stage, owner, next action, due, blocker, attention) |
| `components/crm/WorkflowBoard.tsx` | Kanban columns by stage |
| `components/crm/WorkflowSummaryCards.tsx` | Active / Needs Attention / Blocked / Ready to Move counts |
| `components/crm/WorkflowFilters.tsx` | Owner, stage, blocked, attention, linked-pricing, account status |
| `components/crm/WorkflowPanel.tsx` | Embedded section in AccountDetail (header, owner, next action, blocker, pricing ref, suggestions) |
| `components/crm/WorkflowChecklist.tsx` | Stage-grouped checklist with toggle + required indicators |
| `components/crm/WorkflowStageModal.tsx` | Manual stage change with reason + incomplete-checklist warning |
| `components/crm/WorkflowPricingReference.tsx` | Linked client + reference version selector |
| `components/crm/WorkflowCollaborators.tsx` | Add/remove lightweight collaborators |
| `components/crm/WorkflowSeedReview.tsx` | Lightweight review surface for seeded records (dialog from Workflow Home) |
| `components/crm/WorkflowInitButton.tsx` | "Initialize Workflow" empty-state CTA in AccountDetail |
| `components/crm/PricingLinkPrompt.tsx` | Modal triggered after first version save (Pricing) |

### New hooks / types
| File | Purpose |
|---|---|
| `types/workflow.ts` | Enums (`WORKFLOW_STAGES`, `BLOCKER_TYPES`, `SEED_CONFIDENCE`), row + insert/update types |
| `hooks/useWorkflowRecords.ts` | List/detail queries with filters; query key `["workflow-records", filters]` |
| `hooks/useWorkflowMutations.ts` | Create/init, update, change stage (writes history), set blocker, set next action |
| `hooks/useWorkflowChecklist.ts` | Read + toggle checklist items; seeds defaults on init |
| `hooks/useWorkflowSuggestions.ts` | Reads suggestions; resolve (accept/dismiss) |
| `hooks/useWorkflowCollaborators.ts` | Add/remove collaborators |

---

## Database (new tables)

All under `public.`, RLS enabled, follow CRM pattern: read/insert/update for `is_approved_user(auth.uid())`, delete for creator-or-admin.

**New enums**
- `workflow_stage`: `Lead`, `Discovery`, `Pricing`, `Negotiation`, `MoU`, `Pricing Agreement`, `Onboarding`, `Live`, `Collections`, `Lost`
- `workflow_blocker_type`: `Awaiting Customer`, `Awaiting Internal`, `Legal`, `Pricing`, `Technical`, `Other`
- `workflow_suggestion_status`: `pending`, `accepted`, `dismissed`
- `workflow_seed_confidence`: `confirmed`, `inferred`, `needs_review`

**`workflow_records`** (one active per account)
- `id uuid pk`, `account_id uuid not null unique`, `stage workflow_stage not null default 'Lead'`
- `owner_id uuid`, `next_action_title text`, `next_action_due_at timestamptz`
- `is_blocked boolean not null default false`, `blocker_type workflow_blocker_type`, `blocker_reason text`
- `linked_client_id uuid`, `reference_version_id uuid`
- `stage_entered_at timestamptz default now()`, `last_reviewed_at timestamptz`
- `seed_confidence workflow_seed_confidence`, `seed_notes text`
- `created_by uuid not null`, `updated_by uuid`, `created_at`, `updated_at`
- **Validation trigger** (not CHECK): if `is_blocked=true` then `blocker_reason` required.
- Unique constraint on `account_id` enforces "one active workflow per account".

**`workflow_collaborators`**
- `id`, `workflow_id`, `user_id`, `role text default 'collaborator'`, `created_at`
- Unique `(workflow_id, user_id)`.

**`workflow_checklist_items`**
- `id`, `workflow_id`, `stage workflow_stage`, `item_key text`, `label text`
- `is_required boolean default false`, `is_complete boolean default false`
- `completed_at`, `completed_by`, `evidence_type text`, `notes text`
- `created_at`, `updated_at`. Unique `(workflow_id, stage, item_key)`.

**`workflow_stage_history`**
- `id`, `workflow_id`, `from_stage`, `to_stage`, `changed_by`, `changed_at default now()`, `reason text`, `source text` (`manual` | `suggestion_accepted` | `seed`)

**`workflow_stage_suggestions`**
- `id`, `workflow_id`, `suggested_stage`, `reason_code text`, `reason_text text`, `status workflow_suggestion_status default 'pending'`, `created_at`, `resolved_at`, `resolved_by`

**Triggers / functions**
- `update_workflow_updated_at()` — bumps `updated_at` on `workflow_records`.
- `validate_workflow_blocker()` — enforces blocker_reason when blocked.
- `seed_default_checklist(workflow_id)` — security definer; inserts default items per stage on workflow init.

No FKs added across CRM tables (consistent with current codebase pattern); references validated in code.

---

## Stage logic

- **Manual confirmation only.** No auto-advance.
- `WorkflowStageModal` shows incomplete required items as a soft warning; user can still confirm.
- On confirm: update `workflow_records.stage` + `stage_entered_at`, insert `workflow_stage_history` row.
- **Suggestions** (computed client-side from existing data, written to `workflow_stage_suggestions` only when generated by an explicit "refresh suggestions" action — keeps it deterministic and visible):
  - `Pricing` suggested when account has a linked pricing client but stage < Pricing.
  - `MoU` suggested when a document of type matching `mou` keyword exists.
  - `Onboarding` suggested when a Won opportunity exists.
  - Each suggestion shown as a card; user accepts (opens stage modal pre-filled) or dismisses.

## Needs Attention rules (deterministic, in `useWorkflowRecords` selector)
A workflow is flagged when any of:
- `next_action_due_at < now()`
- `next_action_title` is null
- `is_blocked = true`
- `stage_entered_at` older than **14 days** (config constant)
- stage ∈ {`Pricing`, `Negotiation`, `Pricing Agreement`} and `reference_version_id` is null

## Default checklists per stage (seeded on init)
Compact, editable later. E.g.:
- **Lead**: Identify decision maker (req), Initial outreach logged
- **Discovery**: Discovery call completed (req), Pain points documented
- **Pricing**: Pricing client linked (req), Reference version selected (req)
- **Negotiation**: Commercials shared (req), Internal approval
- **MoU**: MoU drafted (req), MoU signed (req)
- **Pricing Agreement**: Agreement signed (req)
- **Onboarding**: Kickoff scheduled (req), Access provisioned
- **Live**: Go-live confirmed (req)
- **Collections**: First invoice sent (req), First payment received

---

## Pricing first-save linking prompt

In `src/components/pricing/PricingToolbar.tsx` (or wherever the first version save lives — verify during build), after a successful save where the client had **zero prior versions**, open `PricingLinkPrompt`:
- "Link to Existing Account" → searchable account picker → updates `crm_accounts.linked_client_id`.
- "Create New Account" → opens existing `AccountForm` pre-filled with client name.
- "Skip for Now" → dismiss; remember per-session via component state (no new persistence).

Existing `/?clientId=<uuid>` handoff stays unchanged.

---

## AccountDetail integration

- Add new tab **"Workflow"** (becomes default when a workflow exists for the account).
- If no workflow: show empty state with **"Initialize Workflow"** CTA → creates `workflow_records` row + seeds default checklist.
- WorkflowPanel composes: header (stage badge + Change Stage), Next Action card, Blocker card, Pricing Reference, Checklist, Collaborators, Suggestions, Recent stage history (last 5).

---

## Phasing

1. **Shell + types**: route, nav, page skeleton, `types/workflow.ts`, placeholder hooks.
2. **DB migration**: enums, 5 tables, RLS, validation trigger, `seed_default_checklist` function.
3. **Hooks + Workflow Home**: list/board/queue/attention with filters and summary cards.
4. **AccountDetail Workflow tab**: panel, checklist, stage modal, blocker/next action UI.
5. **Pricing reference + first-save prompt + Create Task from workflow** (reuses existing `TaskForm`).
6. **Seed utility + review surface**: import script driven by user-provided notes (run as a one-off; review dialog lets users confirm / edit / mark needs-review). Seeded rows get `seed_confidence` and `seed_notes` populated.
7. **Polish**: empty/loading/error states, a11y pass, query invalidation review.

---

## Out of scope (explicit)
- Multiple workflows per account
- Auto-advance / AI suggestions
- Comments, notifications, integrations
- Refactors to Pricing or CRM Tasks
- New roles or auth changes
- Replacing `sonner` toasts (existing dual-toast tech debt left as-is)

## Docs/changelog
Per the maintenance rule, will update `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/UX_FLOWS.md`, and append a `CHANGELOG.md` entry covering the new module, schema, and the Pricing linking prompt decision.
