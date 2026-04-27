import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowRecord } from "@/types/workflow";

export const WORKFLOW_KEY = "workflow-records";

export function useWorkflowRecords() {
  return useQuery({
    queryKey: [WORKFLOW_KEY, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_records")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowRecord[];
    },
  });
}

export function useWorkflowByAccount(accountId: string | null) {
  return useQuery({
    queryKey: [WORKFLOW_KEY, "by-account", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("workflow_records")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkflowRecord | null) ?? null;
    },
  });
}

export function useWorkflowStageHistory(workflowId: string | null) {
  return useQuery({
    queryKey: [WORKFLOW_KEY, "history", workflowId],
    enabled: !!workflowId,
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_stage_history")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}
