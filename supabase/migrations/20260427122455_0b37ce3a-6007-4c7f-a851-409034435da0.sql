
-- ============ ENUMS ============
CREATE TYPE public.workflow_stage AS ENUM (
  'Lead','Discovery','Pricing','Negotiation','MoU','Pricing Agreement','Onboarding','Live','Collections','Lost'
);

CREATE TYPE public.workflow_blocker_type AS ENUM (
  'Awaiting Customer','Awaiting Internal','Legal','Pricing','Technical','Other'
);

CREATE TYPE public.workflow_suggestion_status AS ENUM ('pending','accepted','dismissed');

CREATE TYPE public.workflow_seed_confidence AS ENUM ('confirmed','inferred','needs_review');

-- ============ TABLES ============
CREATE TABLE public.workflow_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  stage public.workflow_stage NOT NULL DEFAULT 'Lead',
  owner_id uuid,
  next_action_title text,
  next_action_due_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  blocker_type public.workflow_blocker_type,
  blocker_reason text,
  linked_client_id uuid,
  reference_version_id uuid,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  seed_confidence public.workflow_seed_confidence,
  seed_notes text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_records_stage ON public.workflow_records(stage);
CREATE INDEX idx_workflow_records_owner ON public.workflow_records(owner_id);
CREATE INDEX idx_workflow_records_account ON public.workflow_records(account_id);

CREATE TABLE public.workflow_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'collaborator',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, user_id)
);

CREATE TABLE public.workflow_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_records(id) ON DELETE CASCADE,
  stage public.workflow_stage NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_complete boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  evidence_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, stage, item_key)
);

CREATE INDEX idx_checklist_workflow_stage ON public.workflow_checklist_items(workflow_id, stage);

CREATE TABLE public.workflow_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_records(id) ON DELETE CASCADE,
  from_stage public.workflow_stage,
  to_stage public.workflow_stage NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  source text NOT NULL DEFAULT 'manual'
);

CREATE INDEX idx_stage_history_workflow ON public.workflow_stage_history(workflow_id, changed_at DESC);

CREATE TABLE public.workflow_stage_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_records(id) ON DELETE CASCADE,
  suggested_stage public.workflow_stage NOT NULL,
  reason_code text NOT NULL,
  reason_text text,
  status public.workflow_suggestion_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX idx_suggestions_workflow_status ON public.workflow_stage_suggestions(workflow_id, status);

-- ============ FUNCTIONS & TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_records_updated_at
  BEFORE UPDATE ON public.workflow_records
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();

CREATE TRIGGER trg_workflow_checklist_updated_at
  BEFORE UPDATE ON public.workflow_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();

CREATE OR REPLACE FUNCTION public.validate_workflow_blocker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_blocked = true AND (NEW.blocker_reason IS NULL OR length(trim(NEW.blocker_reason)) = 0) THEN
    RAISE EXCEPTION 'blocker_reason is required when is_blocked is true';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflow_validate_blocker
  BEFORE INSERT OR UPDATE ON public.workflow_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_workflow_blocker();

CREATE OR REPLACE FUNCTION public.seed_default_checklist(_workflow_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workflow_checklist_items (workflow_id, stage, item_key, label, is_required) VALUES
    (_workflow_id, 'Lead', 'identify_dm', 'Identify decision maker', true),
    (_workflow_id, 'Lead', 'initial_outreach', 'Initial outreach logged', false),
    (_workflow_id, 'Discovery', 'discovery_call', 'Discovery call completed', true),
    (_workflow_id, 'Discovery', 'pain_points', 'Pain points documented', false),
    (_workflow_id, 'Pricing', 'pricing_linked', 'Pricing client linked', true),
    (_workflow_id, 'Pricing', 'reference_version', 'Reference version selected', true),
    (_workflow_id, 'Negotiation', 'commercials_shared', 'Commercials shared', true),
    (_workflow_id, 'Negotiation', 'internal_approval', 'Internal approval obtained', false),
    (_workflow_id, 'MoU', 'mou_drafted', 'MoU drafted', true),
    (_workflow_id, 'MoU', 'mou_signed', 'MoU signed', true),
    (_workflow_id, 'Pricing Agreement', 'agreement_signed', 'Agreement signed', true),
    (_workflow_id, 'Onboarding', 'kickoff_scheduled', 'Kickoff scheduled', true),
    (_workflow_id, 'Onboarding', 'access_provisioned', 'Access provisioned', false),
    (_workflow_id, 'Live', 'go_live_confirmed', 'Go-live confirmed', true),
    (_workflow_id, 'Collections', 'first_invoice', 'First invoice sent', true),
    (_workflow_id, 'Collections', 'first_payment', 'First payment received', false)
  ON CONFLICT (workflow_id, stage, item_key) DO NOTHING;
END;
$$;

-- ============ RLS ============
ALTER TABLE public.workflow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_suggestions ENABLE ROW LEVEL SECURITY;

-- workflow_records
CREATE POLICY "Approved users can read workflow_records" ON public.workflow_records
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert workflow_records" ON public.workflow_records
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update workflow_records" ON public.workflow_records
  FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete workflow_records" ON public.workflow_records
  FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- workflow_collaborators
CREATE POLICY "Approved users can read workflow_collaborators" ON public.workflow_collaborators
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert workflow_collaborators" ON public.workflow_collaborators
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can delete workflow_collaborators" ON public.workflow_collaborators
  FOR DELETE TO authenticated USING (public.is_approved_user(auth.uid()));

-- workflow_checklist_items
CREATE POLICY "Approved users can read workflow_checklist" ON public.workflow_checklist_items
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert workflow_checklist" ON public.workflow_checklist_items
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update workflow_checklist" ON public.workflow_checklist_items
  FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can delete workflow_checklist" ON public.workflow_checklist_items
  FOR DELETE TO authenticated USING (public.is_approved_user(auth.uid()));

-- workflow_stage_history (append-only)
CREATE POLICY "Approved users can read stage_history" ON public.workflow_stage_history
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert stage_history" ON public.workflow_stage_history
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));

-- workflow_stage_suggestions
CREATE POLICY "Approved users can read suggestions" ON public.workflow_stage_suggestions
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert suggestions" ON public.workflow_stage_suggestions
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update suggestions" ON public.workflow_stage_suggestions
  FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Creator or admin can delete suggestions" ON public.workflow_stage_suggestions
  FOR DELETE TO authenticated USING (public.is_approved_user(auth.uid()) AND public.has_role(auth.uid(),'admin'));
