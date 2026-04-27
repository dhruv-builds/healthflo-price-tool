import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { WorkflowChecklistItem } from "@/types/workflow";

const KEY = "workflow-checklist";

export function useWorkflowChecklist(workflowId: string | null) {
  return useQuery({
    queryKey: [KEY, workflowId],
    enabled: !!workflowId,
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_checklist_items")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("stage")
        .order("is_required", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowChecklistItem[];
    },
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
      const { data, error } = await supabase
        .from("workflow_checklist_items")
        .update({
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null,
          completed_by: isComplete ? user?.id ?? null : null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowChecklistItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
