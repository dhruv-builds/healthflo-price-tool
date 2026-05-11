
CREATE TYPE public.commercial_logo_scope AS ENUM ('global', 'account');
CREATE TYPE public.commercial_logo_kind AS ENUM ('vendor', 'client', 'partner', 'other');

CREATE TABLE public.commercial_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.commercial_logo_scope NOT NULL,
  account_id uuid NULL,
  label text NOT NULL,
  file_path text NOT NULL,
  kind public.commercial_logo_kind NOT NULL DEFAULT 'other',
  natural_width integer NULL,
  natural_height integer NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_logos_scope_account_chk CHECK (
    (scope = 'global' AND account_id IS NULL) OR
    (scope = 'account' AND account_id IS NOT NULL)
  )
);

CREATE INDEX commercial_logos_account_idx ON public.commercial_logos(account_id);
CREATE INDEX commercial_logos_scope_idx ON public.commercial_logos(scope);

ALTER TABLE public.commercial_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read commercial_logos"
  ON public.commercial_logos FOR SELECT TO authenticated
  USING (public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can insert commercial_logos"
  ON public.commercial_logos FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_user(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update account commercial_logos"
  ON public.commercial_logos FOR UPDATE TO authenticated
  USING (public.is_approved_user(auth.uid()) AND scope = 'account')
  WITH CHECK (public.is_approved_user(auth.uid()) AND scope = 'account');

CREATE POLICY "Admins can update global commercial_logos"
  ON public.commercial_logos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Approved users can delete account commercial_logos"
  ON public.commercial_logos FOR DELETE TO authenticated
  USING (public.is_approved_user(auth.uid()) AND scope = 'account');

CREATE POLICY "Admins can delete global commercial_logos"
  ON public.commercial_logos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER commercial_logos_updated_at
  BEFORE UPDATE ON public.commercial_logos
  FOR EACH ROW EXECUTE FUNCTION public.update_commercial_updated_at();
