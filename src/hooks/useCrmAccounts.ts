import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmAccount, CrmAccountInsert, CrmAccountUpdate } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const ACCOUNTS_KEY = "crm-accounts";

export function useCrmAccounts(filters?: {
  account_type?: string;
  status?: string;
  owner_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [ACCOUNTS_KEY, filters],
    queryFn: async () => {
      let q = supabase.from("crm_accounts").select("*").order("updated_at", { ascending: false });
      if (filters?.account_type) q = q.eq("account_type", filters.account_type);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.owner_id) q = q.eq("owner_id", filters.owner_id);
      if (filters?.search) q = q.ilike("name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmAccount[];
    },
  });
}

export function useCrmAccount(id: string | null) {
  return useQuery({
    queryKey: [ACCOUNTS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("crm_accounts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as CrmAccount | null;
    },
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmAccountInsert) => {
      const { data, error } = await supabase.from("crm_accounts").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast({ title: "Account saved" });
    },
    onError: (e: Error) => toast({ title: "Error saving account", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CrmAccountUpdate & { id: string }) => {
      const { data, error } = await supabase.from("crm_accounts").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as CrmAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast({ title: "Account updated" });
    },
    onError: (e: Error) => toast({ title: "Error updating account", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast({ title: "Account deleted" });
    },
    onError: (e: Error) => toast({ title: "Error deleting account", description: e.message, variant: "destructive" }),
  });
}
