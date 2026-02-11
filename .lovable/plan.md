

# HealthFlo Pricing Tool — Update Plan

## Summary
This update restructures one-time costs around a multi-hospital model, removes the Contract LTV section, adds Indian number formatting to inputs, collapses the overage section by default, and prevents search engine indexing.

---

## Changes

### 1. No-Index Meta Tag
Add `<meta name="robots" content="noindex, nofollow" />` to `index.html` in the `<head>` section.

### 2. Remove "Expected Visits/Month" Field
- Remove `expectedVisits` from the `PricingInputs` interface in `types/pricing.ts`
- Remove it from both templates in `utils/templates.ts`
- Remove the input field from `PricingSidebar.tsx`
- Remove the row from the Excel export in `utils/exportExcel.ts`

### 3. Restructure One-Time Costs
**Update `PricingInputs` type** to replace `implementationCost` and `followUpCost` with:
- `numberOfHospitals: number` (default: 1)
- `implementationCostFirstHospital: number` (default: 500000)
- `followUpCostPerAdditional: number` (default: 100000)

**Update templates** with matching defaults.

**Update sidebar** to show three fields under "One-Time Costs": Number of Hospitals, Implementation Cost (First Hospital), Follow-up Cost (Per Additional Hospital).

### 4. Indian Number Formatting on Inputs
Replace the `NumberInput` component in `PricingSidebar.tsx` with a formatted version:
- Display value with Indian comma grouping (e.g., `1,00,000`)
- On focus, show raw number for easy editing
- On blur, re-format with commas
- Currency-prefixed fields show `₹` prefix

### 5. Collapse Overage Analysis by Default
Wrap the `OverageAnalysis` component in a collapsible container using the existing `Collapsible` component from Radix UI. It will:
- Still only render when Actual Visits > Included Visits
- Default to collapsed state
- Show a "Show Overage Analysis" toggle button with a warning badge indicating overage count

### 6. Remove Contract LTV Section
- Delete `src/components/pricing/ContractLTVTable.tsx`
- Remove its import and usage from `Index.tsx`
- Remove the `calculateLTV` function from `utils/calculations.ts`
- Remove the LTV Scenario dropdown from the sidebar (and `ltvScenarioIndex` from the type)
- Remove LTV data from the Excel export

### 7. New "Pricing Summary (Including Implementation)" Section
Create a new component `src/components/pricing/ImplementationSummaryTable.tsx`:

**Columns**: Base, 10% Off, 20% Off, 30% Off, 40% Off, 50% Off

**Rows**:
| Row | Logic |
|-----|-------|
| Annual Recurring Price | From each tier's `annualPrice` (discount applied) |
| Implementation Cost (1st Hospital) | Constant across all columns |
| Follow-up Costs (N-1 Additional Hospitals) | `(numberOfHospitals - 1) * followUpCostPerAdditional` — constant across all columns. Row hidden if hospitals = 1 |
| **Total First-Year Cost** | Sum of above three rows. Bold with distinct background highlight |

Discounts only affect the Annual Recurring Price row. Implementation and follow-up costs are constant.

**Placement**: Below Unit Economics table, above where LTV used to be.

### 8. Update Excel Export
- Replace LTV tab data with the new Implementation Summary table
- Update the Inputs tab to reflect new fields (Number of Hospitals, Implementation Cost First Hospital, Follow-up Cost Per Additional)
- Remove Expected Visits and LTV-related rows

---

## Technical Details

### Files Modified
| File | Change |
|------|--------|
| `index.html` | Add noindex meta tag |
| `src/types/pricing.ts` | Remove `expectedVisits`, `ltvScenarioIndex`; rename cost fields; add `numberOfHospitals` |
| `src/utils/templates.ts` | Update defaults for new field names |
| `src/utils/calculations.ts` | Remove `calculateLTV` function |
| `src/utils/exportExcel.ts` | Replace LTV with implementation summary; update inputs tab |
| `src/components/pricing/PricingSidebar.tsx` | Rewrite `NumberInput` with Indian formatting; update fields |
| `src/components/pricing/OverageAnalysis.tsx` | Wrap in Collapsible, default collapsed |
| `src/pages/Index.tsx` | Remove ContractLTVTable, add ImplementationSummaryTable |

### Files Created
| File | Purpose |
|------|---------|
| `src/components/pricing/ImplementationSummaryTable.tsx` | New first-year cost summary table |

### Files Deleted
| File | Reason |
|------|--------|
| `src/components/pricing/ContractLTVTable.tsx` | Replaced by ImplementationSummaryTable |

