import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmDocument, CrmDocumentInsert } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const KEY = "crm-documents";

export function useCrmDocuments(accountId: string | null) {
  return useQuery({
    queryKey: [KEY, accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase.from("crm_documents").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmDocument[];
    },
    enabled: !!accountId,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmDocumentInsert) => {
      const { data, error } = await supabase.from("crm_documents").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmDocument;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.account_id] });
      toast({ title: "Document added" });
    },
    onError: (e: Error) => toast({ title: "Error adding document", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, account_id, file_path }: { id: string; account_id: string; file_path?: string | null }) => {
      // Delete file from storage if it exists
      if (file_path) {
        await supabase.storage.from("crm-files").remove([file_path]);
      }
      const { error } = await supabase.from("crm_documents").delete().eq("id", id);
      if (error) throw error;
      return account_id;
    },
    onSuccess: (accountId) => {
      qc.invalidateQueries({ queryKey: [KEY, accountId] });
      toast({ title: "Document removed" });
    },
    onError: (e: Error) => toast({ title: "Error removing document", description: e.message, variant: "destructive" }),
  });
}

export async function uploadCrmFile(file: File, userId: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("crm-files").upload(path, file);
  if (error) throw error;
  return path;
}

export function getCrmFileUrl(filePath: string): string {
  const { data } = supabase.storage.from("crm-files").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getCrmFileSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
