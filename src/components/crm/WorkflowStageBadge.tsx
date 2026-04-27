import { Badge } from "@/components/ui/badge";
import type { WorkflowStage } from "@/types/workflow";

const stageColors: Record<WorkflowStage, string> = {
  Lead: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  Discovery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  Pricing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  Negotiation: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  MoU: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Pricing Agreement": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  Onboarding: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Collections: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  Lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function WorkflowStageBadge({ stage }: { stage: WorkflowStage }) {
  return (
    <Badge variant="secondary" className={stageColors[stage]}>
      {stage}
    </Badge>
  );
}
