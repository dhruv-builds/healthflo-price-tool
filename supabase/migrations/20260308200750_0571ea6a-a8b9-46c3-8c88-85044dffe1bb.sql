
-- ============================================
-- CRM MODULE: Enums, Tables, Functions, Triggers, RLS, Storage, Indexes
-- ============================================

-- 1. ENUMS
CREATE TYPE public.crm_account_type AS ENUM ('Hospital', 'Clinic', 'Doctor');
CREATE TYPE public.crm_source AS ENUM ('Founder Network', 'Outbound', 'Referral', 'Inbound', 'Partner', 'Event', 'Existing Relationship');
CREATE TYPE public.crm_account_status AS ENUM ('Active', 'Dormant', 'Won Customer', 'Lost', 'Archived');
CREATE TYPE public.crm_opp_stage AS ENUM ('Prospecting', 'Discovery', 'Demo', 'Proposal', 'Pricing', 'Negotiation', 'Won', 'Lost');
CREATE TYPE public.crm_activity_type AS ENUM ('Meeting', 'Call', 'Demo', 'Email', 'Note');
CREATE TYPE public.crm_task_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE public.crm_task_status AS ENUM ('Open', 'In Progress', 'Done');
CREATE TYPE public.crm_item_type AS ENUM ('file', 'link');

-- 2. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND approved = true
  )
$$;

-- 3. TABLES

-- crm_accounts
CREATE TABLE public.crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type crm_account_type NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  source crm_source NOT NULL,
  referrer_name text,
  geography text,
  status crm_account_status NOT NULL DEFAULT 'Active',
  website text,
  notes text,
  linked_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  last_activity_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_contacts
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  seniority text,
  location text,
  linkedin_url text,
  phone text,
  email text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_opportunities
CREATE TABLE public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage crm_opp_stage NOT NULL DEFAULT 'Prospecting',
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  expected_value numeric,
  expected_close_date date,
  next_step text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_activities
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  activity_type crm_activity_type NOT NULL,
  title text,
  activity_date timestamptz NOT NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  notes text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_tasks
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assignee_id uuid NOT NULL REFERENCES auth.users(id),
  due_date timestamptz NOT NULL,
  priority crm_task_priority NOT NULL DEFAULT 'Medium',
  status crm_task_status NOT NULL DEFAULT 'Open',
  account_id uuid REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.crm_activities(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_documents (account-level files/links)
CREATE TABLE public.crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  item_type crm_item_type NOT NULL,
  title text NOT NULL,
  url text,
  file_path text,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_activity_attachments (activity-level files/links)
CREATE TABLE public.crm_activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.crm_activities(id) ON DELETE CASCADE,
  item_type crm_item_type NOT NULL,
  title text NOT NULL,
  url text,
  file_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. TRIGGER: update last_activity_at on crm_accounts
CREATE OR REPLACE FUNCTION public.update_account_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.crm_accounts
  SET last_activity_at = NEW.activity_date, updated_at = now()
  WHERE id = NEW.account_id
    AND (last_activity_at IS NULL OR last_activity_at < NEW.activity_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_account_last_activity
AFTER INSERT ON public.crm_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_account_last_activity();

-- 5. RLS

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_attachments ENABLE ROW LEVEL SECURITY;

-- crm_accounts policies
CREATE POLICY "Approved users can read accounts" ON public.crm_accounts FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert accounts" ON public.crm_accounts FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update accounts" ON public.crm_accounts FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Admins can delete accounts" ON public.crm_accounts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- crm_contacts policies
CREATE POLICY "Approved users can read contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert contacts" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update contacts" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete contacts" ON public.crm_contacts FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- crm_opportunities policies
CREATE POLICY "Approved users can read opportunities" ON public.crm_opportunities FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert opportunities" ON public.crm_opportunities FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update opportunities" ON public.crm_opportunities FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete opportunities" ON public.crm_opportunities FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- crm_activities policies
CREATE POLICY "Approved users can read activities" ON public.crm_activities FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert activities" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update activities" ON public.crm_activities FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete activities" ON public.crm_activities FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- crm_tasks policies
CREATE POLICY "Approved users can read tasks" ON public.crm_tasks FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert tasks" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update tasks" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete tasks" ON public.crm_tasks FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- crm_documents policies
CREATE POLICY "Approved users can read documents" ON public.crm_documents FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert documents" ON public.crm_documents FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete documents" ON public.crm_documents FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- crm_activity_attachments policies
CREATE POLICY "Approved users can read attachments" ON public.crm_activity_attachments FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert attachments" ON public.crm_activity_attachments FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete attachments" ON public.crm_activity_attachments FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 6. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('crm-files', 'crm-files', false);

CREATE POLICY "Approved users can upload crm files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'crm-files' AND public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can read crm files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'crm-files' AND public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete crm files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'crm-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- 7. INDEXES
CREATE INDEX idx_crm_accounts_owner ON public.crm_accounts(owner_id);
CREATE INDEX idx_crm_accounts_type ON public.crm_accounts(account_type);
CREATE INDEX idx_crm_accounts_status ON public.crm_accounts(status);
CREATE INDEX idx_crm_accounts_source ON public.crm_accounts(source);
CREATE INDEX idx_crm_accounts_last_activity ON public.crm_accounts(last_activity_at);
CREATE INDEX idx_crm_accounts_linked_client ON public.crm_accounts(linked_client_id);
CREATE INDEX idx_crm_contacts_account ON public.crm_contacts(account_id);
CREATE INDEX idx_crm_opportunities_account ON public.crm_opportunities(account_id);
CREATE INDEX idx_crm_opportunities_stage ON public.crm_opportunities(stage);
CREATE INDEX idx_crm_activities_account ON public.crm_activities(account_id);
CREATE INDEX idx_crm_activities_date ON public.crm_activities(activity_date);
CREATE INDEX idx_crm_tasks_assignee ON public.crm_tasks(assignee_id);
CREATE INDEX idx_crm_tasks_status ON public.crm_tasks(status);
CREATE INDEX idx_crm_tasks_priority ON public.crm_tasks(priority);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX idx_crm_tasks_account ON public.crm_tasks(account_id);
CREATE INDEX idx_crm_documents_account ON public.crm_documents(account_id);
CREATE INDEX idx_crm_activity_attachments_activity ON public.crm_activity_attachments(activity_id);
