import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmActivity, CrmActivityInsert, CrmActivityAttachment, CrmActivityAttachmentInsert } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const KEY = "crm-activities";
const ATTACH_KEY = "crm-activity-attachments";

export function useCrmActivities(accountId: string | null) {
  return useQuery({
    queryKey: [KEY, accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase.from("crm_activities").select("*").eq("account_id", accountId).order("activity_date", { ascending: false });
      if (error) throw error;
      return data as CrmActivity[];
    },
    enabled: !!accountId,
  });
}

export function useRecentActivities(limit = 20) {
  return useQuery({
    queryKey: [KEY, "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_activities").select("*").order("activity_date", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as CrmActivity[];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmActivityInsert) => {
      const { data, error } = await supabase.from("crm_activities").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmActivity;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["crm-accounts"] });
      toast({ title: "Activity logged" });
    },
    onError: (e: Error) => toast({ title: "Error logging activity", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Activity deleted" });
    },
    onError: (e: Error) => toast({ title: "Error deleting activity", description: e.message, variant: "destructive" }),
  });
}

// Activity attachments
export function useCrmActivityAttachments(activityId: string | null) {
  return useQuery({
    queryKey: [ATTACH_KEY, activityId],
    queryFn: async () => {
      if (!activityId) return [];
      const { data, error } = await supabase.from("crm_activity_attachments").select("*").eq("activity_id", activityId).order("created_at");
      if (error) throw error;
      return data as CrmActivityAttachment[];
    },
    enabled: !!activityId,
  });
}

export function useCreateActivityAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CrmActivityAttachmentInsert) => {
      const { data, error } = await supabase.from("crm_activity_attachments").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmActivityAttachment;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [ATTACH_KEY, vars.activity_id] });
    },
  });
}

export function useDeleteActivityAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_activity_attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ATTACH_KEY] });
    },
  });
}
