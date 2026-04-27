import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AccountProfile,
  CommercialDocStatus,
  CommercialDocType,
  CommercialGenerationMode,
  CommercialTemplateScope,
  CommercialTemplateStatus,
  DocumentDoc,
  computeUnresolvedFields,
} from "@/types/commercialDoc";

// ---------- Account profile ----------
export function useCommercialAccountProfile(accountId: string | null) {
  return useQuery({
    queryKey: ["commercial-account-profile", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<AccountProfile | null> => {
      const { data, error } = await supabase
        .from("commercial_account_profiles")
        .select("*")
        .eq("account_id", accountId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AccountProfile | null;
    },
  });
}

export function useUpsertAccountProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountProfile) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      const { data, error } = await supabase
        .from("commercial_account_profiles")
        .upsert(
          { ...input, created_by: userId, updated_by: userId } as any,
          { onConflict: "account_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["commercial-account-profile", vars.account_id] });
      toast.success("Profile saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save profile"),
  });
}

// ---------- Templates ----------
export interface TemplateRow {
  id: string;
  name: string;
  doc_type: CommercialDocType;
  scope: CommercialTemplateScope;
  account_id: string | null;
  status: CommercialTemplateStatus;
  default_generation_mode: CommercialGenerationMode;
  base_template_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersionRow {
  id: string;
  template_id: string;
  version_number: number;
  structure_json: DocumentDoc;
  is_current: boolean;
  published_at: string | null;
  created_at: string;
}

export function useCommercialTemplates(filter?: {
  doc_type?: CommercialDocType;
  account_id?: string | null;
}) {
  return useQuery({
    queryKey: ["commercial-templates", filter ?? {}],
    queryFn: async (): Promise<TemplateRow[]> => {
      let q = supabase
        .from("commercial_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter?.doc_type) q = q.eq("doc_type", filter.doc_type);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as TemplateRow[];
      if (filter?.account_id !== undefined) {
        rows = rows.filter(
          (r) => r.scope === "global" || r.account_id === filter.account_id
        );
      }
      return rows;
    },
  });
}

export function useTemplateCurrentVersion(templateId: string | null) {
  return useQuery({
    queryKey: ["commercial-template-version", templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<TemplateVersionRow | null> => {
      const { data, error } = await supabase
        .from("commercial_template_versions")
        .select("*")
        .eq("template_id", templateId!)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TemplateVersionRow | null;
    },
  });
}

export function useTemplateVersions(templateId: string | null) {
  return useQuery({
    queryKey: ["commercial-template-versions", templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<TemplateVersionRow[]> => {
      const { data, error } = await supabase
        .from("commercial_template_versions")
        .select("*")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemplateVersionRow[];
    },
  });
}

export function useTemplateMutations() {
  const qc = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (input: {
      name: string;
      doc_type: CommercialDocType;
      scope: CommercialTemplateScope;
      account_id?: string | null;
      description?: string;
      default_generation_mode?: CommercialGenerationMode;
      base_template_id?: string | null;
      initial_structure: DocumentDoc;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id!;
      const { data: tpl, error } = await supabase
        .from("commercial_templates")
        .insert({
          name: input.name,
          doc_type: input.doc_type,
          scope: input.scope,
          account_id: input.account_id ?? null,
          description: input.description ?? null,
          default_generation_mode: input.default_generation_mode ?? "structure_only",
          base_template_id: input.base_template_id ?? null,
          status: "draft",
          created_by: userId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const { error: vErr } = await supabase
        .from("commercial_template_versions")
        .insert({
          template_id: tpl.id,
          version_number: 1,
          structure_json: input.initial_structure as any,
          is_current: true,
          created_by: userId,
        } as any);
      if (vErr) throw vErr;
      return tpl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commercial-templates"] });
      toast.success("Template created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const updateTemplate = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<TemplateRow>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("commercial_templates")
        .update({ ...input.patch, updated_by: u.user?.id } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commercial-templates"] }),
  });

  const publishNewVersion = useMutation({
    mutationFn: async (input: { templateId: string; structure: DocumentDoc }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("commercial_template_versions")
        .insert({
          template_id: input.templateId,
          structure_json: input.structure as any,
          is_current: true,
          published_at: new Date().toISOString(),
          created_by: u.user?.id!,
        } as any);
      if (error) throw error;
      await supabase
        .from("commercial_templates")
        .update({ status: "published" } as any)
        .eq("id", input.templateId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["commercial-templates"] });
      qc.invalidateQueries({ queryKey: ["commercial-template-version", vars.templateId] });
      qc.invalidateQueries({ queryKey: ["commercial-template-versions", vars.templateId] });
      toast.success("Template version published");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (input: {
      sourceId: string;
      name: string;
      scope: CommercialTemplateScope;
      account_id?: string | null;
    }) => {
      const { data: src, error: e1 } = await supabase
        .from("commercial_templates")
        .select("*")
        .eq("id", input.sourceId)
        .single();
      if (e1) throw e1;
      const { data: srcV, error: e2 } = await supabase
        .from("commercial_template_versions")
        .select("*")
        .eq("template_id", input.sourceId)
        .eq("is_current", true)
        .single();
      if (e2) throw e2;
      const { data: u } = await supabase.auth.getUser();
      const { data: tpl, error: e3 } = await supabase
        .from("commercial_templates")
        .insert({
          name: input.name,
          doc_type: src.doc_type,
          scope: input.scope,
          account_id: input.account_id ?? null,
          description: src.description,
          default_generation_mode: src.default_generation_mode,
          base_template_id: input.sourceId,
          status: "draft",
          created_by: u.user?.id!,
        } as any)
        .select()
        .single();
      if (e3) throw e3;
      await supabase.from("commercial_template_versions").insert({
        template_id: tpl.id,
        version_number: 1,
        structure_json: srcV.structure_json,
        is_current: true,
        created_by: u.user?.id!,
      } as any);
      return tpl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commercial-templates"] });
      toast.success("Template duplicated");
    },
  });

  return { createTemplate, updateTemplate, publishNewVersion, duplicateTemplate };
}

// ---------- Documents ----------
export interface DocumentRow {
  id: string;
  account_id: string;
  doc_type: CommercialDocType;
  title: string;
  template_id: string | null;
  template_version_id: string | null;
  generation_mode: CommercialGenerationMode;
  linked_client_id: string | null;
  linked_version_id: string | null;
  status: CommercialDocStatus;
  content_json: DocumentDoc;
  inherited_profile_snapshot: Record<string, unknown>;
  manual_overrides: Record<string, unknown>;
  unresolved_fields: { path: string; label: string; severity: string }[];
  derived_from_document_id: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  exported_at: string | null;
}

export function useCommercialDocuments(accountId: string | null) {
  return useQuery({
    queryKey: ["commercial-documents", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from("commercial_documents")
        .select("*")
        .eq("account_id", accountId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentRow[];
    },
  });
}

export function useCommercialDocument(documentId: string | null) {
  return useQuery({
    queryKey: ["commercial-document", documentId],
    enabled: !!documentId,
    queryFn: async (): Promise<DocumentRow | null> => {
      const { data, error } = await supabase
        .from("commercial_documents")
        .select("*")
        .eq("id", documentId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DocumentRow | null;
    },
  });
}

export function useDocumentMutations() {
  const qc = useQueryClient();

  const createDocument = useMutation({
    mutationFn: async (input: {
      account_id: string;
      doc_type: CommercialDocType;
      title: string;
      template_id: string | null;
      template_version_id: string | null;
      generation_mode: CommercialGenerationMode;
      linked_client_id?: string | null;
      linked_version_id?: string | null;
      content: DocumentDoc;
      profile_snapshot?: Record<string, unknown>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const unresolved = computeUnresolvedFields(input.content);
      const { data, error } = await supabase
        .from("commercial_documents")
        .insert({
          account_id: input.account_id,
          doc_type: input.doc_type,
          title: input.title,
          template_id: input.template_id,
          template_version_id: input.template_version_id,
          generation_mode: input.generation_mode,
          linked_client_id: input.linked_client_id ?? null,
          linked_version_id: input.linked_version_id ?? null,
          content_json: input.content as any,
          inherited_profile_snapshot: input.profile_snapshot ?? {},
          unresolved_fields: unresolved as any,
          status: "draft",
          created_by: u.user?.id!,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DocumentRow;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["commercial-documents", d.account_id] });
      toast.success("Document created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const updateDocument = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DocumentRow> }) => {
      const { data: u } = await supabase.auth.getUser();
      const patch: any = { ...input.patch, updated_by: u.user?.id };
      if (patch.content_json) {
        patch.unresolved_fields = computeUnresolvedFields(patch.content_json) as any;
      }
      const { error } = await supabase
        .from("commercial_documents")
        .update(patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["commercial-document", vars.id] });
      qc.invalidateQueries({ queryKey: ["commercial-documents"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const deleteDocument = useMutation({
    mutationFn: async (input: { id: string; account_id: string }) => {
      const { error } = await supabase
        .from("commercial_documents")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["commercial-documents", vars.account_id] });
      toast.success("Document deleted");
    },
  });

  const duplicateDocument = useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error } = await supabase
        .from("commercial_documents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      const { data, error: e2 } = await supabase
        .from("commercial_documents")
        .insert({
          account_id: src.account_id,
          doc_type: src.doc_type,
          title: `${src.title} (copy)`,
          template_id: src.template_id,
          template_version_id: src.template_version_id,
          generation_mode: src.generation_mode,
          linked_client_id: src.linked_client_id,
          linked_version_id: src.linked_version_id,
          content_json: src.content_json,
          inherited_profile_snapshot: src.inherited_profile_snapshot,
          manual_overrides: src.manual_overrides,
          unresolved_fields: src.unresolved_fields,
          derived_from_document_id: id,
          status: "draft",
          created_by: u.user?.id!,
        } as any)
        .select()
        .single();
      if (e2) throw e2;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["commercial-documents", d.account_id] });
      toast.success("Document duplicated");
    },
  });

  return { createDocument, updateDocument, deleteDocument, duplicateDocument };
}

// ---------- Exports ----------
export interface ExportRow {
  id: string;
  document_id: string;
  format: "pdf" | "docx";
  file_path: string;
  file_size_bytes: number | null;
  exported_by: string;
  exported_at: string;
}

export function useDocumentExports(documentId: string | null) {
  return useQuery({
    queryKey: ["commercial-document-exports", documentId],
    enabled: !!documentId,
    queryFn: async (): Promise<ExportRow[]> => {
      const { data, error } = await supabase
        .from("commercial_document_exports")
        .select("*")
        .eq("document_id", documentId!)
        .order("exported_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExportRow[];
    },
  });
}

export function useExportDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { documentId: string; format: "pdf" | "docx" }) => {
      const { data, error } = await supabase.functions.invoke(
        "commercial-doc-export",
        { body: input }
      );
      if (error) throw error;
      return data as { signedUrl: string; filePath: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["commercial-document-exports", vars.documentId],
      });
      qc.invalidateQueries({ queryKey: ["commercial-document", vars.documentId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Export failed"),
  });
}

// ---------- Storage helpers ----------
export async function uploadCommercialAsset(
  accountId: string,
  file: File,
  kind: "logo" | "signature" | "asset"
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `commercial/${accountId}/${kind}s/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("crm-files").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function getCommercialAssetUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("crm-files")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
