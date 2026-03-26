

# CRM Refinements: Branding + Interactive Status Badges

## 1. Global Branding Update

Replace "NileFlow" → "HealthFlo" in two files:
- **`src/components/GlobalHeader.tsx`** line 16: `NileFlow` → `HealthFlo`, line 17: `Enterprise Suite` → `Enterprise Suite` (unchanged)
- **`src/pages/Auth.tsx`** line 62: `NileFlow` → `HealthFlo`, line 63: `Enterprise CRM Tool` → `Enterprise Pricing & CRM Tool`

`TopBar.tsx`, `exportExcel.ts`, and `README.md` already say "HealthFlo" — no changes needed.

## 2. Interactive Status Badge Component

Create **`src/components/crm/StatusBadgeDropdown.tsx`** — a shared component used in both the Accounts table and Account Detail header.

```text
┌──────────┐
│ Active ▾ │  ← looks like current badge with tiny caret
└──────────┘
     ↓ click
┌──────────────┐
│ ○ Active     │
│ ○ Dormant    │
│ ○ Won Customer│
│ ○ Lost       │
│ ○ Archived   │
└──────────────┘
```

**Props:** `accountId: string`, `currentStatus: CrmAccountStatus`, `onStatusChange?: () => void`

**Behavior:**
- Uses shadcn `DropdownMenu` with `DropdownMenuRadioGroup`
- Trigger renders styled like current `Badge` with matching color + a `ChevronDown` icon
- On select, calls `useUpdateAccount().mutateAsync({ id, status, updated_by })` 
- Shows toast on error; query cache invalidation already handled by the existing mutation hook
- Stops event propagation on click (important for table rows which navigate on click)

## 3. Accounts Table Update

**`src/components/crm/AccountsTable.tsx`** — replace the static status `<Badge>` in the table row with `<StatusBadgeDropdown accountId={a.id} currentStatus={a.status} />`.

## 4. Account Detail Header Update

**`src/pages/crm/AccountDetail.tsx`** line 76 — replace `<Badge variant="outline">{account.status}</Badge>` with `<StatusBadgeDropdown accountId={account.id} currentStatus={account.status} />`.

## Files Changed
| File | Change |
|------|--------|
| `src/components/GlobalHeader.tsx` | NileFlow → HealthFlo |
| `src/pages/Auth.tsx` | NileFlow → HealthFlo |
| `src/components/crm/StatusBadgeDropdown.tsx` | **New** — shared interactive status dropdown |
| `src/components/crm/AccountsTable.tsx` | Use StatusBadgeDropdown in status column |
| `src/pages/crm/AccountDetail.tsx` | Use StatusBadgeDropdown in header |

No database changes, no new migrations, no changes to existing hooks or forms.

