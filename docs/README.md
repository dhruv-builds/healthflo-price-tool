# HealthFlo Documentation

This folder is the source of truth for how HealthFlo is built. It is intended to be detailed enough that a new contributor (human or AI) can onboard without reading the entire codebase.

## Index

| File | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview, modules, routing, cross-module integration |
| [DATABASE.md](./DATABASE.md) | Tables, enums, RLS, storage buckets |
| [AUTH.md](./AUTH.md) | Roles, approval gating, permissions matrix |
| [UX_FLOWS.md](./UX_FLOWS.md) | Pricing flow, CRM flows, presentation mode |
| [TECH_DEBT.md](./TECH_DEBT.md) | Known gaps, risks, future cleanup |
| [../CHANGELOG.md](../CHANGELOG.md) | Chronological log of major updates and decisions |

## Maintenance Rule

When making a **major update**, you **must**:

1. Update the relevant `/docs/*.md` file(s) so they continue to reflect the actual state of the app.
2. Add a `CHANGELOG.md` entry that includes a **Decisions** section explaining *why* the change was made — not just *what*.

### What counts as a "major update"

- New page, route, or top-level feature
- Database schema change (new table, column, enum, RLS policy, trigger, function)
- Auth / role / permission change
- New external integration, secret, or third-party dependency
- Branding or naming changes that affect users
- Breaking changes to shared components, hooks, or contexts

Trivial style tweaks, copy fixes, and bug fixes scoped to a single component do **not** require docs or changelog updates (but may be grouped under a `Fixed` bullet if shipped alongside major work).

## Format conventions

- Markdown only. No external doc generators.
- Use tables for structured data (schemas, routes, permission matrices).
- Use fenced code blocks for SQL, TypeScript, and ASCII diagrams.
- Keep each file focused on its concern; cross-link rather than duplicate.
