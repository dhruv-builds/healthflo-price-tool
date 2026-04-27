# Changelog

All notable changes to HealthFlo are documented here. Format inspired by [Keep a Changelog](https://keepachangelog.com).

Entry categories: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Decisions`.

Every major entry **must** include a `Decisions` section explaining *why* the change was made. See [`docs/README.md`](./docs/README.md#maintenance-rule) for what counts as "major".

---

## [2026-04-27] Workflow module — Phase 5 (Pricing linking prompt + Seed Review)

### Added
- **Pricing first-save linking prompt** (`PricingLinkPrompt.tsx`) shown after a brand-new pricing client is created in the Pricing module. Three actions:
  - **Link to Existing Account** — searchable list of CRM accounts (filtered to those without an existing link, plus the current one).
  - **Create New Account** — opens the existing `AccountForm` pre-filled with the client's name; on save, the new account is auto-linked to the pricing client.
  - **Skip for Now** — dismiss; remembered per-session via local component state so the user isn't re-prompted.
- **Seed Review** view added as a fifth tab in Workflow Home (`/crm/workflows`). Lists every workflow record where `seed_confidence` is set, with **Confirm / Edit / Needs Review** actions and inline preview of seeded next action, blocker, and seed notes.
- New hook `useWorkflowSeed` (`useUpdateSeedConfidence`).
- `AccountForm` gained additive optional props `defaultName` and `onCreated(account)` to support the prefilled-create-and-link flow without breaking existing callers.

### Decisions
- **Trigger only on brand-new client creation**, not on every save. The "first save" of a pricing client is unambiguous because Pricing creates client + first version atomically inside `handleNewClient`. This avoids the prompt re-firing on routine saves.
- **Per-session skip state** (Set of skipped client IDs in component state) is intentionally non-persistent. If a user reopens the app the prompt may re-appear for the same client, which is acceptable for an MVP "strong nudge" pattern. We can persist this later if it becomes annoying.
- **No new mutation for create-and-link.** We reuse `useCreateAccount` (via `AccountForm`) and the existing `useUpdateAccount` to set `linked_client_id`. Keeps the surface area additive.
- **No automated seed importer in this phase.** No user-provided notes/screenshots were attached, so we did not invent seed data. The schema (`seed_confidence`, `seed_notes`) and the **Seed Review** UI are in place; when notes are provided the import will be executed via a one-off SQL/data tool that populates `workflow_records` with `seed_confidence = 'inferred'` or `'needs_review'`. This keeps the rule "do not invent unsupported facts."
- **Seed Review reuses existing AccountDetail "Edit"** rather than introducing a separate edit modal — single source of truth for editing workflow data.

### Changed
- `ClientLibrary` now opens `PricingLinkPrompt` on the success of `createClient`.
- Workflow Home's view tabs now include **Seed Review**; stage filter is hidden in this view.

### Docs
- Updated `docs/UX_FLOWS.md` (Pricing linking flow, Seed Review flow) and `docs/TECH_DEBT.md` (seed importer pending; per-session skip noted).

---

## [2026-04-27] Workflow module (MVP)

### Added
- New **Workflow** module at `/crm/workflows` with List, My Queue, Needs Attention, and Board views.
- Embedded **Workflow** tab inside `AccountDetail` (becomes the default tab when a workflow exists; "Initialize Workflow" empty state otherwise).
- Workflow Panel surfaces stage, next action, blocker, pricing reference (linked client + reference version), per-stage checklist, and stage history.
- New Supabase tables: `workflow_records` (one active per `account_id`), `workflow_collaborators`, `workflow_checklist_items`, `workflow_stage_history`, `workflow_stage_suggestions`, with matching RLS following the existing CRM `is_approved_user` pattern.
- New enums: `workflow_stage`, `workflow_blocker_type`, `workflow_suggestion_status`, `workflow_seed_confidence`.
- DB helper `seed_default_checklist(uuid)` populates a per-stage checklist on workflow init.
- Validation trigger requires `blocker_reason` whenever `is_blocked = true`.
- New hooks: `useWorkflowRecords`, `useWorkflowMutations`, `useWorkflowChecklist`. New types in `src/types/workflow.ts` (incl. deterministic `getAttentionReasons`).
- New components: `WorkflowPanel`, `WorkflowList`, `WorkflowBoard`, `WorkflowChecklist`, `WorkflowStageModal`, `WorkflowStageBadge`.

### Decisions
- **Workflow stage is separate from `crm_accounts.status`.** Account status remains the high-level lifecycle/business state; workflow stage is the *operational* progression and lives on its own table.
- **One active workflow per account** enforced by a `UNIQUE` constraint on `workflow_records.account_id`. Avoids ambiguity in MVP; multi-workflow can be modeled later if needed.
- **Manual stage changes only** — no auto-advance. Suggestions are scaffolded (table + status enum) but the UI today only supports manual changes via `WorkflowStageModal`, with incomplete required checklist items shown as a soft warning, not a block.
- **Checklist ≠ Tasks.** Checklist items represent readiness conditions stored in `workflow_checklist_items`. CRM Tasks remain the assigned-action layer and are reachable via "Create Task" from the workflow panel (reuses existing `TaskForm`).
- **Pricing untouched in this iteration.** Workflow links to an existing pricing client and lets the user pin a single reference version via dropdown. The planned first-save Pricing linking prompt and the seed-review utility are deferred to a follow-up entry to keep this change reviewable.
- **Validation via trigger, not CHECK.** The blocker-reason rule uses a `BEFORE INSERT/UPDATE` trigger so it remains restoreable and editable, consistent with the project's "no time-based CHECK constraints" guidance.
- **No new FK to CRM tables from workflow rows** (account/client/version), matching the existing CRM convention; integrity is validated in code.
- **Attention rules are deterministic** (overdue / missing next action / blocked / stage stale > 14d / missing pricing reference for Pricing-family stages). Computed in the client, no fuzzy scoring.

### Changed
- `CrmLayout` nav now includes a **Workflow** entry between Tasks/Reports and Accounts.
- `AccountDetail` Tabs now include a **Workflow** tab, set as the default when a workflow record exists for the account.
- `App.tsx` registers the new `/crm/workflows` route under the existing CRM layout.

### Docs
- `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/UX_FLOWS.md`, and `docs/TECH_DEBT.md` updated to cover the Workflow module.

---

## [2026-04-27] In-repo documentation + changelog

### Added
- `/docs/` Markdown documentation pack:
  - `ARCHITECTURE.md`, `DATABASE.md`, `AUTH.md`, `UX_FLOWS.md`, `TECH_DEBT.md`, `README.md` (index).
- `CHANGELOG.md` (this file), seeded with recent history.

### Changed
- Root `README.md` gained a **Documentation** section linking to `/docs` and `CHANGELOG.md`, plus the maintenance rule.

### Decisions
- Chose **plain Markdown in `/docs`** over a generated docs site or a single mega-file: zero tooling, diffable in PRs, renders on GitHub/Lovable, easy for future AI sessions to find and edit.
- Split docs by concern (architecture vs. DB vs. auth vs. flows vs. debt) so updates stay scoped — a schema change touches `DATABASE.md` only, not a 2000-line monolith.
- Adopted a **dated changelog with a mandatory `Decisions` section** instead of automated tooling (changesets, semantic-release): overkill for current team size, and the `Decisions` block captures the *why* that automation cannot.

---

## [2026-04-27] HealthFlo rebrand + interactive status badges

### Changed
- Replaced all UI instances of "NileFlow" → **"HealthFlo"** in `src/components/GlobalHeader.tsx` and `src/pages/Auth.tsx`.

### Added
- `src/components/crm/StatusBadgeDropdown.tsx` — shared interactive status dropdown.
  - Used in the CRM accounts table (`src/components/crm/AccountsTable.tsx`).
  - Used in the Account Detail header (`src/pages/crm/AccountDetail.tsx`).
  - Triggers `useUpdateAccount().mutateAsync()`, invalidates React Query cache, surfaces success/error via `sonner` toast.

### Decisions
- Kept the badge's existing visual styling and only added a small caret to signal interactivity, avoiding a heavier redesign and preserving table density.
- Reused the existing `useUpdateAccount` mutation rather than introducing a new endpoint, so cache invalidation behavior stays consistent across the app.
- Added `e.stopPropagation()` to the dropdown trigger so opening it does not also navigate the row.

---

## [2026-04-26] Dialog scrollability fix

### Fixed
- Tall forms inside shadcn `Dialog` were clipped on shorter viewports. Added `max-h-[90vh] overflow-y-auto` to `DialogContent` in `src/components/ui/dialog.tsx`.

### Decisions
- Patched the shared primitive once instead of adding scroll wrappers to every consumer dialog — single source of truth, every existing and future dialog benefits automatically.

---

## [2026-04-25] CRM Reports + Presentation Mode

### Added
- **CRM Reports page** (`/crm/reports`) with stale-account detection (>14 days idle) and pipeline visibility grouped by opportunity stage.
- **Presentation Mode** toggle in `src/pages/Index.tsx` (admin-only) that hides cost / margin / unit-economics columns during screen-shared demos.

### Decisions
- Stale threshold set to **14 days** as a sensible default for B2B healthcare sales cycles; intentionally not configurable yet to keep the UI simple — revisit if customers ask.
- Presentation Mode is an in-session toggle (not persisted) so admins cannot accidentally leave costs hidden after a demo.
