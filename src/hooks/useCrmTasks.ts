import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmTask, CrmTaskInsert, CrmTaskUpdate, CrmTaskStatus } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const KEY = "crm-tasks";

export function useCrmTasks(filters?: {
  assignee_id?: string;
  status?: CrmTaskStatus;
  account_id?: string;
  overdue?: boolean;
  dueThisWeek?: boolean;
}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      let q = supabase.from("crm_tasks").select("*").order("due_date", { ascending: true });
      if (filters?.assignee_id) q = q.eq("assignee_id", filters.assignee_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.account_id) q = q.eq("account_id", filters.account_id);
      if (filters?.overdue) {
        q = q.lt("due_date", new Date().toISOString()).neq("status", "Done");
      }
      if (filters?.dueThisWeek) {
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        q = q.lte("due_date", endOfWeek.toISOString()).neq("status", "Done");
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmTask[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CrmTaskInsert) => {
      const { data, error } = await supabase.from("crm_tasks").insert(input as any).select().single();
      if (error) throw error;
      return data as CrmTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Task created" });
    },
    onError: (e: Error) => toast({ title: "Error creating task", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CrmTaskUpdate & { id: string }) => {
      const { data, error } = await supabase.from("crm_tasks").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as CrmTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Task updated" });
    },
    onError: (e: Error) => toast({ title: "Error updating task", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Error deleting task", description: e.message, variant: "destructive" }),
  });
}
