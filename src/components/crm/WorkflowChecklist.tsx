import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleChecklistItem } from "@/hooks/useWorkflowChecklist";
import type { WorkflowChecklistItem, WorkflowStage } from "@/types/workflow";

interface Props {
  items: WorkflowChecklistItem[];
  currentStage: WorkflowStage;
}

export function WorkflowChecklist({ items, currentStage }: Props) {
  const toggle = useToggleChecklistItem();

  // Group by stage
  const grouped = items.reduce<Record<string, WorkflowChecklistItem[]>>((acc, it) => {
    (acc[it.stage] ||= []).push(it);
    return acc;
  }, {});

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No checklist items.</p>;
  }

  // Show current stage first
  const stageOrder = [currentStage, ...Object.keys(grouped).filter((s) => s !== currentStage)];

  return (
    <div className="space-y-4">
      {stageOrder.map((stage) => {
        const list = grouped[stage];
        if (!list?.length) return null;
        const isCurrent = stage === currentStage;
        return (
          <div key={stage}>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</h4>
              {isCurrent && <Badge variant="outline" className="text-[10px] py-0">Current</Badge>}
            </div>
            <ul className="space-y-1.5">
              {list.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={item.is_complete}
                    onCheckedChange={(v) => toggle.mutate({ id: item.id, isComplete: !!v })}
                    className="mt-0.5"
                  />
                  <span className={item.is_complete ? "text-muted-foreground line-through" : ""}>
                    {item.label}
                    {item.is_required && <span className="ml-1 text-destructive">*</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
