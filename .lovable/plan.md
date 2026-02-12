

# Multi-User HealthFlo Pricing Tool with Auth & Client Versioning

## Overview
Transform the current client-side pricing tool into a multi-user, database-backed application with Admin/Employee roles, a Client Library with version management, and enhanced Pricing Summary rows. Uses Lovable Cloud for authentication and database.

---

## 1. Database Schema (Lovable Cloud / Supabase)

### Tables

**profiles** — stores user role
- `id` (uuid, FK to auth.users, PK)
- `email` (text)
- `created_at` (timestamptz)

**user_roles** — stores roles separately (security best practice)
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users, ON DELETE CASCADE)
- `role` (app_role enum: 'admin', 'employee')
- Unique constraint on (user_id, role)

**clients** — each client/deal
- `id` (uuid, PK)
- `name` (text)
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz)

**versions** — snapshots of pricing inputs per client
- `id` (uuid, PK)
- `client_id` (uuid, FK to clients, ON DELETE CASCADE)
- `name` (text, e.g. "v1")
- `data` (jsonb — stores entire PricingInputs object)
- `notes` (text)
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz)

### Trigger: Auto-assign role on signup
A database trigger on `profiles` insert that checks if it is the first user. If yes, inserts 'admin' role; otherwise inserts 'employee' role into `user_roles`.

### Seed Data
Insert two default clients ("Jeena Seekho Enterprise" and "India General Pricing") with a "v1" version each, containing their respective template defaults as JSON.

### RLS Policies
- All authenticated users can read clients and versions
- All authenticated users can insert/update clients and versions
- Only admins can delete clients (checked via `has_role()` security definer function)
- Users can read their own profile and role

---

## 2. Authentication

### Login Page (`/auth`)
- Email/Password sign-up and sign-in
- Google OAuth button
- Redirect to `/` (dashboard) on success

### Auth Context (`AuthProvider`)
- React context wrapping the app
- Manages Supabase session via `onAuthStateChange`
- Fetches user role from `user_roles` table
- Exposes: `user`, `role` ('admin' | 'employee'), `loading`, `signOut`
- Protected route wrapper redirects unauthenticated users to `/auth`

---

## 3. Role-Based Access Control

### Hidden from Employees
- **Sidebar**: "Cost to Company/Visit" input field
- **Main Canvas**: Entire "Unit Economics" table
- **Client Library**: "Delete Client" button

### Visible to All
- Implementation Cost and Follow-up Cost inputs
- All other tables and controls

---

## 4. Client Library (Replaces Templates & Snapshots)

### Sidebar Changes
Replace the Template dropdown and Snapshot section with a "Client Library" panel:

- **Current Client Display**: Shows active client name and version
- **"Select Client" Button**: Opens a drawer/modal with:
  - List of all clients with their versions
  - "New Client" button
  - Per-client actions: Rename, Duplicate, Delete (admin only)
- **Version Controls**:
  - "Save" button: Updates current version's data in the database
  - "Save As" button: Creates a new version (prompts for name and optional notes)
- **Remove**: Old template dropdown and LocalStorage snapshot manager

### Data Flow
- Selecting a client/version loads its JSON `data` into the `PricingInputs` state
- Saving writes the current `PricingInputs` state back to the version's `data` column
- The `template` field in `PricingInputs` becomes optional/removed since clients replace templates

---

## 5. Pricing Summary Table Enhancements

Restructure the existing Pricing Summary table rows into three visual sections:

**Section 1: Monthly Breakdown**
1. Monthly Base Price — `basePrice * (1 - discount)`
2. Overage Price — calculated excess cost (0 if no overage)
3. Total Monthly Price — sum of rows 1+2
4. *Horizontal separator line*

**Section 2: Unit Rates**
5. Base Price per Visit — `Monthly Base Price / Included Visits`
6. Overage Price per Visit — the per-visit overage rate (with discount applied per scope)
7. Effective Price per Visit — `Total Monthly Price / Actual Visits`
8. *Horizontal separator line*

**Section 3: Annual**
9. Annual Price — `Total Monthly Price * 12`

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Auth.tsx` | Login/signup page |
| `src/contexts/AuthContext.tsx` | Auth provider with role fetching |
| `src/components/pricing/ClientLibrary.tsx` | Client selection drawer/modal with CRUD |
| `src/hooks/useClients.ts` | React Query hooks for clients & versions CRUD |

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add AuthProvider wrapper, `/auth` route, protected route logic |
| `src/types/pricing.ts` | Remove `template` and `Snapshot` type; update `PricingInputs` |
| `src/pages/Index.tsx` | Use AuthContext for role; conditional rendering; load client data |
| `src/components/pricing/PricingSidebar.tsx` | Replace template/snapshot with Client Library; hide cost field for employees |
| `src/components/pricing/PricingSummaryTable.tsx` | Add new rows (base price per visit, overage per visit) with section separators |
| `src/components/pricing/UnitEconomicsTable.tsx` | Wrap in admin-only check |
| `src/utils/templates.ts` | Keep as fallback defaults for new client creation |
| `src/utils/exportExcel.ts` | Update to reflect new Pricing Summary rows |

## 8. Files to Delete

| File | Reason |
|------|--------|
| None | All existing files are modified in place |

---

## 9. Migration Sequence

1. Enable Lovable Cloud backend
2. Run database migrations: create enum, tables, trigger, RLS policies, seed data
3. Enable Google OAuth in Lovable Cloud dashboard
4. Build Auth page and AuthContext
5. Build Client Library UI and hooks
6. Update Pricing Summary table rows
7. Apply role-based conditional rendering
8. Update Excel export

