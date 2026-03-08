import { CrmTask } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateTask } from "@/hooks/useCrmTasks";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-gray-100 text-gray-600",
};

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-orange-100 text-orange-700",
  Done: "bg-green-100 text-green-700",
};

interface TasksListProps {
  tasks: CrmTask[];
  isLoading: boolean;
  onEdit?: () => void;
}

export function TasksList({ tasks, isLoading, onEdit }: TasksListProps) {
  const updateTask = useUpdateTask();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add a follow-up so the next step is clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const isOverdue = new Date(t.due_date) < new Date() && t.status !== "Done";
        return (
          <div key={t.id} className={`flex items-center justify-between rounded-md border bg-card p-3 ${isOverdue ? "border-destructive/30" : ""}`}>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                disabled={t.status === "Done"}
                onClick={() => updateTask.mutate({ id: t.id, status: "Done" })}
              >
                <CheckCircle2 className={`h-4 w-4 ${t.status === "Done" ? "text-green-600" : "text-muted-foreground"}`} />
              </Button>
              <div>
                <p className={`text-sm font-medium ${t.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColors[t.priority] || ""}>{t.priority}</Badge>
              <Badge className={statusColors[t.status] || ""}>{t.status}</Badge>
              <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {format(new Date(t.due_date), "MMM d")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
