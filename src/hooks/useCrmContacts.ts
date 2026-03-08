import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmContact, CrmContactInsert, CrmContactUpdate } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const KEY = "crm-contacts";

export function useCrmContacts(accountId: string | null) {
  return useQuery({
    queryKey: [KEY, accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase.from("crm_contacts").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmContact[];
    },
    enabled: !!accountId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmContactInsert) => {
      const { data, error } = await supabase.from("crm_contacts").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmContact;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.account_id] });
      toast({ title: "Contact saved" });
    },
    onError: (e: Error) => toast({ title: "Error saving contact", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, account_id, ...updates }: CrmContactUpdate & { id: string; account_id: string }) => {
      const { data, error } = await supabase.from("crm_contacts").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return { ...data, account_id } as CrmContact;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [KEY, d.account_id] });
      toast({ title: "Contact updated" });
    },
    onError: (e: Error) => toast({ title: "Error updating contact", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, account_id }: { id: string; account_id: string }) => {
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
      return account_id;
    },
    onSuccess: (accountId) => {
      qc.invalidateQueries({ queryKey: [KEY, accountId] });
      toast({ title: "Contact deleted" });
    },
    onError: (e: Error) => toast({ title: "Error deleting contact", description: e.message, variant: "destructive" }),
  });
}
