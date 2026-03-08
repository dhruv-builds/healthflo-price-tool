import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmOpportunity, CrmOpportunityInsert, CrmOpportunityUpdate } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const KEY = "crm-opportunities";

export function useCrmOpportunities(accountId: string | null) {
  return useQuery({
    queryKey: [KEY, accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase.from("crm_opportunities").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmOpportunity[];
    },
    enabled: !!accountId,
  });
}

export function useAllOpportunities() {
  return useQuery({
    queryKey: [KEY, "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_opportunities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmOpportunity[];
    },
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmOpportunityInsert) => {
      const { data, error } = await supabase.from("crm_opportunities").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmOpportunity;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Opportunity created" });
    },
    onError: (e: Error) => toast({ title: "Error creating opportunity", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CrmOpportunityUpdate & { id: string }) => {
      const { data, error } = await supabase.from("crm_opportunities").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as CrmOpportunity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Opportunity updated" });
    },
    onError: (e: Error) => toast({ title: "Error updating opportunity", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Opportunity deleted" });
    },
    onError: (e: Error) => toast({ title: "Error deleting opportunity", description: e.message, variant: "destructive" }),
  });
}
