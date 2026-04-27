-- Tighten RLS on clients
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

CREATE POLICY "Approved users can read clients"
ON public.clients FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

-- Tighten RLS on versions
DROP POLICY IF EXISTS "Authenticated users can read versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can insert versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can update versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can delete versions" ON public.versions;

CREATE POLICY "Approved users can read versions"
ON public.versions FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert versions"
ON public.versions FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update versions"
ON public.versions FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Admins can delete versions"
ON public.versions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
