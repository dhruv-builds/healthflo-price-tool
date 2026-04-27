import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WORKFLOW_KEY } from "./useWorkflowRecords";
import type { WorkflowRecord, WorkflowStage, WorkflowBlockerType } from "@/types/workflow";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [WORKFLOW_KEY] });
  qc.invalidateQueries({ queryKey: ["workflow-checklist"] });
}

export function useInitializeWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ accountId, linkedClientId }: { accountId: string; linkedClientId?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("workflow_records")
        .insert({
          account_id: accountId,
          stage: "Lead" as WorkflowStage,
          owner_id: user.id,
          linked_client_id: linkedClientId ?? null,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Seed default checklist
      await supabase.rpc("seed_default_checklist", { _workflow_id: data.id });
      return data as WorkflowRecord;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Workflow initialized");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<Omit<WorkflowRecord, "id" | "created_at" | "created_by">>) => {
      const { data, error } = await supabase
        .from("workflow_records")
        .update({ ...patch, updated_by: user?.id ?? null } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowRecord;
    },
    onSuccess: () => invalidateAll(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChangeWorkflowStage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      workflow,
      toStage,
      reason,
      source = "manual",
    }: {
      workflow: WorkflowRecord;
      toStage: WorkflowStage;
      reason?: string;
      source?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      if (workflow.stage === toStage) return workflow;
      const { error: histErr } = await supabase.from("workflow_stage_history").insert({
        workflow_id: workflow.id,
        from_stage: workflow.stage,
        to_stage: toStage,
        changed_by: user.id,
        reason: reason ?? null,
        source,
      });
      if (histErr) throw histErr;
      const { data, error } = await supabase
        .from("workflow_records")
        .update({
          stage: toStage,
          stage_entered_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", workflow.id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowRecord;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Stage updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetBlocker() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      isBlocked,
      blockerType,
      blockerReason,
    }: {
      id: string;
      isBlocked: boolean;
      blockerType?: WorkflowBlockerType | null;
      blockerReason?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("workflow_records")
        .update({
          is_blocked: isBlocked,
          blocker_type: isBlocked ? blockerType ?? null : null,
          blocker_reason: isBlocked ? blockerReason ?? null : null,
          updated_by: user?.id ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowRecord;
    },
    onSuccess: () => invalidateAll(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}
