
-- 1. Create enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Trigger: auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) INTO is_first;
  
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Only admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Versions table
CREATE TABLE public.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'v1',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read versions" ON public.versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert versions" ON public.versions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update versions" ON public.versions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete versions" ON public.versions
  FOR DELETE TO authenticated USING (true);

-- 8. Seed data: default clients with v1 versions
INSERT INTO public.clients (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Jeena Seekho Enterprise'),
  ('00000000-0000-0000-0000-000000000002', 'India General Pricing');

INSERT INTO public.versions (client_id, name, data) VALUES
  ('00000000-0000-0000-0000-000000000001', 'v1', '{
    "includedVisits": 20000,
    "basePrice": 1000000,
    "overagePrice": 75,
    "costPerVisit": 10,
    "numberOfHospitals": 1,
    "implementationCostFirstHospital": 500000,
    "followUpCostPerAdditional": 100000,
    "actualVisits": 20000,
    "discountScope": "both",
    "notes": ""
  }'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'v1', '{
    "includedVisits": 50000,
    "basePrice": 2500000,
    "overagePrice": 60,
    "costPerVisit": 8,
    "numberOfHospitals": 1,
    "implementationCostFirstHospital": 750000,
    "followUpCostPerAdditional": 150000,
    "actualVisits": 50000,
    "discountScope": "both",
    "notes": ""
  }'::jsonb);
