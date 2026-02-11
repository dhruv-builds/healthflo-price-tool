

# HealthFlo Enterprise Pricing Tool

## Overview
A single-page internal pricing calculator for the HealthFlo sales team to generate enterprise quotes, model discount scenarios, calculate unit economics, and analyze multi-year contract LTV.

---

## 1. Layout & Branding
- **Fixed left sidebar** (~320px) for all inputs and controls
- **Fluid right canvas** for results tables and analysis
- **Sticky top bar** with currency toggle (INR/USD), live exchange rate display, and Export to Excel button
- **HealthFlo Blue (#4285F4)** primary color, clean white cards, light blue (#E8F0FE) table headers
- **Margin-based color coding**: Green (healthy), Amber (0-10%), Red (negative)

## 2. Global Settings & Header
- Live INR-to-USD exchange rate fetched from a free API, with manual override
- Currency toggle that reformats all values (Indian number formatting for INR, US formatting for USD)
- Real-time rate display: "Currency: INR | Rate: ₹84.00 | Source: API | Updated: 2:30 PM"

## 3. Left Sidebar — Inputs
- **Template Selector** dropdown: "Jeena Seekho Enterprise" or "India General Pricing" — auto-fills all defaults from the Excel data
- **Core Inputs**: Expected Visits/Month, Included Visits, Base Price/Month, Overage Price/Visit, Cost to Company/Visit
- **One-Time Costs**: Implementation Cost (₹5L default), Follow-up Cost (₹1L default)
- **Contract Logic**: Discount Scope dropdown (Base Only / Overages Only / Both), LTV Scenario selector
- **Overage Modeling**: Actual Visits input (triggers overage calculations when > Included)
- **Utilities**: Save/Load Snapshot (LocalStorage), Deal Notes text area

## 4. Main Canvas — Pricing Summary Table
- **6 columns**: Base, 10% Off, 20% Off, 30% Off, 40% Off, 50% Off
- **Rows**: Monthly Price (base + overage), Included Visits, Effective Price/Visit, Annual Price
- Discount logic respects the "Discount Scope" setting (applies to base, overages, or both)
- Cells color-coded by margin health

## 5. Main Canvas — Overage Analysis
- Conditionally visible when Actual Visits > Included Visits
- Scenario table showing costs at: Included Count, +10%, +25%, +50%, +100% volume levels
- Helps sales team understand cost escalation at different usage tiers

## 6. Main Canvas — Unit Economics Table
- **Rows**: Monthly Revenue, Monthly Cost, Monthly Profit, Margin %, Annual Profit
- Cost = Actual Visits × Cost to Company/Visit (applies to ALL visits)
- Displayed across all 6 discount tiers with margin color indicators

## 7. Main Canvas — Contract LTV Table
- Shows data for the single discount tier selected in the sidebar
- **Columns**: Month 1, Year 1 (12M), Year 2 (24M), Year 3 (36M)
- **Rows**: Implementation/Follow-up Costs (negative), Recurring Profit, Net Profit, Payback Period (months)

## 8. Excel Export
- Generates a multi-tab .xlsx file using the `xlsx` library:
  - **Tab 1 — INR View**: All tables formatted in INR
  - **Tab 2 — USD View**: All tables converted and formatted in USD
  - **Tab 3 — Inputs**: Summary of all sidebar inputs + FX rate used

## 9. Technical Notes
- All calculations are client-side, no backend needed
- LocalStorage for snapshot persistence
- Indian number formatting (₹10,00,000) for INR mode
- Responsive layout with sidebar collapse on smaller screens

