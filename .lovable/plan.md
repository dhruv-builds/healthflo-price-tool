## Goal

Persist the HealthFlo documentation pack inside the repo so it stays in sync with the code, and add a changelog that records every major update with the decisions behind it.

## Recommended Approach

Use plain Markdown files at the repo root. Markdown is the standard for in-repo docs, renders nicely on GitHub/Lovable, is easy to diff in PRs, and requires zero tooling. We'll split into a few focused files instead of one giant document so updates stay scoped and changelog entries can reference specific sections.

## Files to Create

```text
/docs
  ├── ARCHITECTURE.md      # System overview, modules, routing, integrations
  ├── DATABASE.md          # Tables, enums, RLS, storage buckets
  ├── AUTH.md              # Roles, approval gating, permissions matrix
  ├── UX_FLOWS.md          # Pricing flow, CRM flows, presentation mode
  ├── TECH_DEBT.md         # Known gaps, risks, future cleanup
  └── README.md            # Index/table of contents linking the above
/CHANGELOG.md              # Chronological log of major updates
```

Root-level `README.md` gets a short "Documentation" section pointing to `/docs` and `/CHANGELOG.md`.

### Why this structure
- `/docs` folder is the convention readers expect.
- Splitting by concern (architecture vs. DB vs. auth) keeps files short and makes targeted updates trivial.
- `CHANGELOG.md` at root follows the widely-recognized [Keep a Changelog](https://keepachangelog.com) convention, so any future contributor (human or AI) immediately knows where to look.

## CHANGELOG Format

Each entry is dated and grouped by type. Every major entry includes a "Decisions" sub-bullet capturing the *why*, not just the *what*.

```markdown
## [2026-04-27] HealthFlo Rebrand + Interactive Status Badges

### Changed
- Renamed all UI instances of "NileFlow" → "HealthFlo" (GlobalHeader, Auth page).

### Added
- `src/components/crm/StatusBadgeDropdown.tsx` — inline status editing
  in Accounts table and Account Detail header.

### Decisions
- Kept badge visual styling identical; added only a caret to signal
  interactivity, avoiding a heavier redesign.
- Used existing `useUpdateAccount` mutation rather than a new endpoint
  to preserve cache invalidation behavior.
```

Categories used: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Decisions`.

## Initial Content

- `/docs/*` files will be populated from the documentation pack already produced (the same content delivered in the DOCX), reformatted as Markdown with proper headings, tables, and code fences.
- `CHANGELOG.md` will be seeded with a back-dated entry summarizing the recent work that's already shipped:
  - HealthFlo rebrand
  - Interactive status badge dropdown
  - Dialog scrollability fix (`max-h-[90vh] overflow-y-auto`)
  - CRM Reports (stale account detection, pipeline view)
  - Presentation Mode (admin-only)
  - Documentation pack creation

## Maintenance Rule (Going Forward)

I'll add a short "Documentation Maintenance" note to the root `README.md` and to `/docs/README.md` stating:

> When making a **major update** (new module, schema change, auth/role change, new integration, or notable UX change), update the relevant `/docs/*.md` file **and** add a `CHANGELOG.md` entry including a **Decisions** section.

This gives future AI sessions (and humans) an explicit, discoverable rule. I will follow it on every subsequent change in this project.

### What counts as "major" (and gets a changelog entry)
- New page, route, or top-level feature
- Database schema change (new table, column, enum, RLS policy)
- Auth/permissions change
- New external integration or secret
- Branding/naming changes that affect users
- Breaking changes to shared components or hooks

Trivial style tweaks, copy fixes, and bug fixes scoped to one component do **not** require a changelog entry (but can be grouped under a `Fixed` bullet if shipped alongside major work).

## Out of Scope

- No automated changelog tooling (e.g. changesets, semantic-release) — overkill for current team size.
- No version numbers yet; entries are dated. We can add semver later if the app is ever published as a package.

## Summary of Changes

| File | Action |
|------|--------|
| `docs/README.md` | New — index |
| `docs/ARCHITECTURE.md` | New |
| `docs/DATABASE.md` | New |
| `docs/AUTH.md` | New |
| `docs/UX_FLOWS.md` | New |
| `docs/TECH_DEBT.md` | New |
| `CHANGELOG.md` | New — seeded with recent history |
| `README.md` | Edited — add Documentation + Maintenance section |
