

# Global Header + Pricing Toolbar Restructure

## Problem
The TopBar only renders inside the Pricing page (`Index.tsx`). When navigating to CRM, the header disappears entirely. The user wants a persistent global header across all modules, with pricing-specific controls moved into the Pricing module itself.

## What Changes

### 1. New Global Header (`src/components/GlobalHeader.tsx`)
A slim, persistent header rendered in `App.tsx` above all protected routes. Contains only:
- **HealthFlo** branding (update subtitle from "Enterprise Pricing Tool" to just "Enterprise Tool" or similar)
- **Module switcher** (Pricing | CRM segmented control)
- **Manage Users** button (admin only, non-presentation mode)

This header appears on every authenticated page — Pricing, CRM, and Admin.

### 2. New Pricing Toolbar (`src/components/pricing/PricingToolbar.tsx`)
A secondary bar rendered inside `Index.tsx` (the Pricing page), sitting below the global header. Contains all the pricing-specific controls that currently live in TopBar:
- Currency display + FX rate info strip (Currency: INR | Rate: ₹84.00 | Source | Updated)
- INR/USD toggle
- Presentation mode toggle (admin only)
- Export to Excel button

This keeps the pricing controls contextually relevant and visible only when in Pricing mode. Visually it can be a slightly lighter/thinner bar with a bottom border, clearly a sub-toolbar.

### 3. Modified Files

**`src/App.tsx`** — Wrap all protected routes in a layout that renders `GlobalHeader` at the top. The Pricing route (`/`) and CRM routes both sit below it.

**`src/pages/Index.tsx`** — Remove `<TopBar>`, replace with `<PricingToolbar>` rendered at the top of the pricing content area.

**`src/components/crm/CrmLayout.tsx`** — No changes needed; its sub-nav (Accounts/Tasks/Reports) continues rendering below the global header.

**`src/components/pricing/TopBar.tsx`** — This file gets split into `GlobalHeader` and `PricingToolbar`, then can be removed.

### 4. Layout Structure

```text
┌─────────────────────────────────────────────┐
│ GlobalHeader                                │
│ [HealthFlo]  [Pricing | CRM]  [Manage Users]│
├─────────────────────────────────────────────┤
│ (module content below)                      │
│                                             │
│ If Pricing:                                 │
│ ┌─ PricingToolbar ────────────────────────┐ │
│ │ Currency: INR | Rate | [INR|USD] [Export]│ │
│ ├─────────────────────────────────────────┤ │
│ │ Sidebar + Main content                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ If CRM:                                     │
│ ┌─ CRM Sub-nav ──────────────────────────┐ │
│ │ [Accounts] [Tasks] [Reports]            │ │
│ ├─────────────────────────────────────────┤ │
│ │ CRM content                             │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 5. Implementation Approach

Create an `AuthenticatedLayout` component in `App.tsx` that renders `GlobalHeader` + an `<Outlet />`. Restructure routing so `/`, `/crm/*`, and `/admin/users` are all children of this layout route, eliminating the need for each page to independently render the header.

