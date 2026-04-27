-- ============================================================
-- Commercial Documents module
-- ============================================================

-- Enums
CREATE TYPE public.commercial_doc_type AS ENUM ('mou', 'pricing_addendum');
CREATE TYPE public.commercial_doc_status AS ENUM ('draft', 'needs_review', 'final', 'superseded', 'signed_uploaded');
CREATE TYPE public.commercial_template_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.commercial_generation_mode AS ENUM ('auto_from_pricing', 'structure_only', 'selective_fill');
CREATE TYPE public.commercial_template_scope AS ENUM ('global', 'account');
CREATE TYPE public.commercial_export_format AS ENUM ('pdf', 'docx');

-- ============================================================
-- commercial_account_profiles (1:1 with crm_accounts)
-- ============================================================
CREATE TABLE public.commercial_account_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  client_legal_name text,
  display_name text,
  address text,
  city text,
  state text,
  country text,
  primary_logo_path text,
  secondary_logo_path text,
  signatory_name text,
  signatory_title text,
  signatory_email text,
  vendor_legal_name text,
  vendor_logo_path text,
  vendor_signatory_name text,
  vendor_signatory_title text,
  preferred_subtitle text,
  legal_notes text,
  defaults_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_account_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read commercial_account_profiles"
ON public.commercial_account_profiles FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert commercial_account_profiles"
ON public.commercial_account_profiles FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update commercial_account_profiles"
ON public.commercial_account_profiles FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Admins can delete commercial_account_profiles"
ON public.commercial_account_profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- commercial_templates
-- ============================================================
CREATE TABLE public.commercial_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  doc_type commercial_doc_type NOT NULL,
  scope commercial_template_scope NOT NULL DEFAULT 'global',
  account_id uuid,
  status commercial_template_status NOT NULL DEFAULT 'draft',
  default_generation_mode commercial_generation_mode NOT NULL DEFAULT 'structure_only',
  base_template_id uuid,
  description text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_required_for_account_scope CHECK (
    (scope = 'global' AND account_id IS NULL) OR
    (scope = 'account' AND account_id IS NOT NULL)
  )
);

CREATE INDEX idx_commercial_templates_account ON public.commercial_templates(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_commercial_templates_status ON public.commercial_templates(status);
CREATE INDEX idx_commercial_templates_type ON public.commercial_templates(doc_type);

ALTER TABLE public.commercial_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read commercial_templates"
ON public.commercial_templates FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert commercial_templates"
ON public.commercial_templates FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update commercial_templates"
ON public.commercial_templates FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Creator or admin can delete commercial_templates"
ON public.commercial_templates FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- commercial_template_versions
-- ============================================================
CREATE TABLE public.commercial_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  version_number int NOT NULL,
  structure_json jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

CREATE INDEX idx_template_versions_template ON public.commercial_template_versions(template_id);
CREATE UNIQUE INDEX idx_template_versions_one_current
  ON public.commercial_template_versions(template_id) WHERE is_current = true;

ALTER TABLE public.commercial_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read template_versions"
ON public.commercial_template_versions FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert template_versions"
ON public.commercial_template_versions FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update template_versions"
ON public.commercial_template_versions FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Admins can delete template_versions"
ON public.commercial_template_versions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- commercial_documents
-- ============================================================
CREATE TABLE public.commercial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  doc_type commercial_doc_type NOT NULL,
  title text NOT NULL,
  template_id uuid,
  template_version_id uuid,
  generation_mode commercial_generation_mode NOT NULL DEFAULT 'structure_only',
  linked_client_id uuid,
  linked_version_id uuid,
  status commercial_doc_status NOT NULL DEFAULT 'draft',
  content_json jsonb NOT NULL,
  inherited_profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  unresolved_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  derived_from_document_id uuid,
  notes text,
  created_by uuid NOT NULL,
  updated_by uuid,
  exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commercial_documents_account ON public.commercial_documents(account_id);
CREATE INDEX idx_commercial_documents_status ON public.commercial_documents(status);
CREATE INDEX idx_commercial_documents_type ON public.commercial_documents(doc_type);

ALTER TABLE public.commercial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read commercial_documents"
ON public.commercial_documents FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert commercial_documents"
ON public.commercial_documents FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update commercial_documents"
ON public.commercial_documents FOR UPDATE TO authenticated
USING (public.is_approved_user(auth.uid()))
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Creator or admin can delete commercial_documents"
ON public.commercial_documents FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- commercial_document_exports
-- ============================================================
CREATE TABLE public.commercial_document_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  format commercial_export_format NOT NULL,
  file_path text NOT NULL,
  file_size_bytes int,
  exported_by uuid NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commercial_exports_document ON public.commercial_document_exports(document_id);

ALTER TABLE public.commercial_document_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read commercial_document_exports"
ON public.commercial_document_exports FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert commercial_document_exports"
ON public.commercial_document_exports FOR INSERT TO authenticated
WITH CHECK (public.is_approved_user(auth.uid()));

CREATE POLICY "Admins can delete commercial_document_exports"
ON public.commercial_document_exports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Triggers
-- ============================================================

-- Reuse existing update_workflow_updated_at for symmetry; create dedicated for clarity
CREATE OR REPLACE FUNCTION public.update_commercial_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commercial_account_profiles_updated_at
BEFORE UPDATE ON public.commercial_account_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_commercial_updated_at();

CREATE TRIGGER trg_commercial_templates_updated_at
BEFORE UPDATE ON public.commercial_templates
FOR EACH ROW EXECUTE FUNCTION public.update_commercial_updated_at();

CREATE TRIGGER trg_commercial_documents_updated_at
BEFORE UPDATE ON public.commercial_documents
FOR EACH ROW EXECUTE FUNCTION public.update_commercial_updated_at();

-- Auto-assign version_number per template
CREATE OR REPLACE FUNCTION public.assign_template_version_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number = 0 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO NEW.version_number
      FROM public.commercial_template_versions
      WHERE template_id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_template_version_number
BEFORE INSERT ON public.commercial_template_versions
FOR EACH ROW EXECUTE FUNCTION public.assign_template_version_number();

-- Ensure only one is_current per template
CREATE OR REPLACE FUNCTION public.ensure_one_current_template_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.commercial_template_versions
      SET is_current = false
      WHERE template_id = NEW.template_id
        AND id <> NEW.id
        AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_one_current_template_version
AFTER INSERT OR UPDATE OF is_current ON public.commercial_template_versions
FOR EACH ROW WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.ensure_one_current_template_version();
