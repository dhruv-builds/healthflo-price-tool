import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { WORKFLOW_STAGES, type WorkflowStage, type WorkflowRecord, type WorkflowChecklistItem } from "@/types/workflow";
import { useChangeWorkflowStage } from "@/hooks/useWorkflowMutations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowRecord;
  checklist: WorkflowChecklistItem[];
  defaultTargetStage?: WorkflowStage;
}

export function WorkflowStageModal({ open, onOpenChange, workflow, checklist, defaultTargetStage }: Props) {
  const [target, setTarget] = useState<WorkflowStage>(defaultTargetStage ?? workflow.stage);
  const [reason, setReason] = useState("");
  const change = useChangeWorkflowStage();

  const incomplete = checklist.filter(
    (c) => c.stage === workflow.stage && c.is_required && !c.is_complete
  );

  const submit = async () => {
    await change.mutateAsync({ workflow, toStage: target, reason: reason || undefined });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Current:</span>{" "}
            <span className="font-medium">{workflow.stage}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Target stage</label>
            <Select value={target} onValueChange={(v) => setTarget(v as WorkflowStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {incomplete.length > 0 && target !== workflow.stage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Required items in current stage are incomplete:</p>
                  <ul className="mt-1 list-disc pl-4">
                    {incomplete.map((i) => <li key={i.id}>{i.label}</li>)}
                  </ul>
                  <p className="mt-2">You can still proceed; this is a soft warning.</p>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the stage changing?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={change.isPending || target === workflow.stage}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
