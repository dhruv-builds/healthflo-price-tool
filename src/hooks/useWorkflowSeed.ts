import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WORKFLOW_KEY } from "./useWorkflowRecords";
import type { WorkflowSeedConfidence } from "@/types/workflow";

export function useUpdateSeedConfidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confidence,
    }: {
      id: string;
      confidence: WorkflowSeedConfidence | null;
    }) => {
      const { data, error } = await supabase
        .from("workflow_records")
        .update({ seed_confidence: confidence })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKFLOW_KEY] });
      toast.success("Seed status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
