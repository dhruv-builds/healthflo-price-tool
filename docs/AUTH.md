# Authentication & Authorization

## Sign-in methods

| Method | Notes |
|---|---|
| Email + Password | Standard signup/login. Email verification required before sign-in. |
| Google OAuth | Enabled by default. |

Anonymous sign-in is **not** used and must not be enabled.

## Approval gating

New users land in `profiles` with `approved = false`. Until an admin sets `approved = true`, the user is signed in but every protected route redirects to a "pending approval" state. The gate is enforced in `src/contexts/AuthContext.tsx` and consumed by route guards in `src/App.tsx`.

## Roles

Roles are stored in `public.user_roles` (never on `profiles`). Two roles exist:

| Role | Capabilities |
|---|---|
| `admin` | Full access. Can view cost / margin / unit economics. Can approve users, assign roles, toggle Presentation Mode, access Admin page. |
| `employee` | Standard access. Cannot view cost / margin columns. Cannot access Admin page. |

Role checks happen via the `public.has_role(_user_id uuid, _role app_role)` Postgres function (SECURITY DEFINER, stable, `search_path = public`) — used both in RLS policies and in app code via the React Query `useUserRole` hook.

## Permissions matrix

| Capability | Employee | Admin |
|---|---|---|
| View pricing tiers | ✅ | ✅ |
| View costs / margins / unit economics | ❌ | ✅ |
| Toggle Presentation Mode | ❌ | ✅ |
| CRUD CRM accounts / contacts / opportunities | ✅ | ✅ |
| Upload CRM documents | ✅ | ✅ |
| Approve users | ❌ | ✅ |
| Assign roles | ❌ | ✅ |
| Access Admin page (`/admin`) | ❌ | ✅ |

## Client-side enforcement

`AuthContext` exposes:

```ts
{ session, user, role, approved, loading, signOut }
```

Components and routes consume `role` and `approved` to conditionally render UI. **Server-side RLS is the actual enforcement** — client-side checks are UX only.

## Security rules (do not violate)

1. Roles must never be stored on `profiles` or `auth.users`.
2. Never check admin status from `localStorage` / `sessionStorage`.
3. Never use anonymous sign-in.
4. Auto-confirm email signups must remain disabled unless explicitly requested.
5. RLS must be enabled on every public table.
