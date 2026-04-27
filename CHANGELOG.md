# Changelog

All notable changes to HealthFlo are documented here. Format inspired by [Keep a Changelog](https://keepachangelog.com).

Entry categories: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Decisions`.

Every major entry **must** include a `Decisions` section explaining *why* the change was made. See [`docs/README.md`](./docs/README.md#maintenance-rule) for what counts as "major".

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
