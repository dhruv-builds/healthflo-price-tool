

# Add User Role Management Panel (Admin Only)

## The Problem
Currently, roles are auto-assigned (first user = admin, everyone else = employee) with no way to change them afterward. You need an admin panel to promote or demote users.

## What Will Change

### New Page: User Management (`/admin/users`)
- Accessible only to admins, via a "Manage Users" link in the top bar
- Displays a table of all users (email, role, signup date)
- Each row has a dropdown to switch between "admin" and "employee"
- Changes are saved immediately to the database

### Database Changes
- A new RLS policy on `user_roles` allowing admins to update roles
- A new RLS policy on `profiles` allowing admins to read all profiles (currently users can only see their own)

### UI Changes
- **TopBar**: Add a "Manage Users" button (visible to admins only)
- **App.tsx**: Add a protected `/admin/users` route

---

## Technical Details

### 1. Database Migration (SQL)

Two new RLS policies:

```sql
-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update user roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all roles
CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 2. New File: `src/pages/AdminUsers.tsx`
- Fetches all profiles and their roles (joined)
- Renders a table with columns: Email, Role (dropdown), Joined
- Dropdown calls `supabase.from('user_roles').update({ role }).eq('user_id', userId)`
- Shows toast on success/error
- Wrapped in admin-only check (redirects non-admins)

### 3. Modified File: `src/App.tsx`
- Add route: `/admin/users` pointing to `AdminUsers`, wrapped in `ProtectedRoute`

### 4. Modified File: `src/components/pricing/TopBar.tsx`
- Add a "Manage Users" icon button (e.g., Users icon from lucide) visible when `role === "admin"`
- Links to `/admin/users`

### 5. Modified File: `src/contexts/AuthContext.tsx`
- No changes needed; role is already exposed

