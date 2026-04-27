import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertOctagon, ArrowRightLeft, CheckCircle2, ExternalLink, ListPlus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { WorkflowStageBadge } from "./WorkflowStageBadge";
import { WorkflowStageModal } from "./WorkflowStageModal";
import { WorkflowChecklist } from "./WorkflowChecklist";
import { TaskForm } from "./TaskForm";
import { useWorkflowByAccount, useWorkflowStageHistory } from "@/hooks/useWorkflowRecords";
import { useWorkflowChecklist } from "@/hooks/useWorkflowChecklist";
import { useInitializeWorkflow, useSetBlocker, useUpdateWorkflow } from "@/hooks/useWorkflowMutations";
import { useClients, useVersions } from "@/hooks/useClients";
import {
  WORKFLOW_BLOCKER_TYPES,
  type WorkflowBlockerType,
  getAttentionReasons,
  ATTENTION_REASON_LABELS,
} from "@/types/workflow";
import type { CrmAccount, CrmContact, CrmOpportunity } from "@/types/crm";

interface Props {
  account: CrmAccount;
  contacts: CrmContact[];
  opportunities: CrmOpportunity[];
}

export function WorkflowPanel({ account, contacts, opportunities }: Props) {
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflowByAccount(account.id);
  const { data: checklist = [] } = useWorkflowChecklist(workflow?.id ?? null);
  const { data: history = [] } = useWorkflowStageHistory(workflow?.id ?? null);
  const { data: clients = [] } = useClients();
  const { data: versions = [] } = useVersions(workflow?.linked_client_id ?? null);

  const initialize = useInitializeWorkflow();
  const update = useUpdateWorkflow();
  const setBlocker = useSetBlocker();

  const [showStageModal, setShowStageModal] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingNextAction, setEditingNextAction] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState(false);
  const [naTitle, setNaTitle] = useState("");
  const [naDue, setNaDue] = useState("");
  const [bType, setBType] = useState<WorkflowBlockerType>("Awaiting Customer");
  const [bReason, setBReason] = useState("");

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-md bg-muted" />;
  }

  if (!workflow) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No workflow set up for this account yet.</p>
          <Button
            className="mt-4"
            onClick={() =>
              initialize.mutate({ accountId: account.id, linkedClientId: account.linked_client_id })
            }
            disabled={initialize.isPending}
          >
            Initialize Workflow
          </Button>
        </CardContent>
      </Card>
    );
  }

  const attention = getAttentionReasons(workflow);
  const linkedClient = clients.find((c) => c.id === workflow.linked_client_id);
  const referenceVersion = versions.find((v) => v.id === workflow.reference_version_id);

  const startEditNextAction = () => {
    setNaTitle(workflow.next_action_title ?? "");
    setNaDue(workflow.next_action_due_at ? workflow.next_action_due_at.slice(0, 16) : "");
    setEditingNextAction(true);
  };

  const saveNextAction = async () => {
    await update.mutateAsync({
      id: workflow.id,
      next_action_title: naTitle || null,
      next_action_due_at: naDue ? new Date(naDue).toISOString() : null,
    });
    setEditingNextAction(false);
  };

  const startEditBlocker = () => {
    setBType((workflow.blocker_type as WorkflowBlockerType) ?? "Awaiting Customer");
    setBReason(workflow.blocker_reason ?? "");
    setEditingBlocker(true);
  };

  const saveBlocker = async () => {
    if (!bReason.trim()) return;
    await setBlocker.mutateAsync({
      id: workflow.id,
      isBlocked: true,
      blockerType: bType,
      blockerReason: bReason,
    });
    setEditingBlocker(false);
  };

  const clearBlocker = () =>
    setBlocker.mutate({ id: workflow.id, isBlocked: false, blockerType: null, blockerReason: null });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WorkflowStageBadge stage={workflow.stage} />
          <span className="text-xs text-muted-foreground">
            since {format(new Date(workflow.stage_entered_at), "MMM d, yyyy")}
          </span>
          {workflow.is_blocked && <Badge variant="destructive">Blocked</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowStageModal(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Change Stage
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}>
            <ListPlus className="h-3.5 w-3.5 mr-1" />Create Task
          </Button>
        </div>
      </div>

      {/* Attention */}
      {attention.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex flex-wrap gap-1.5">
            {attention.map((r) => (
              <Badge key={r} variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-200">
                {ATTENTION_REASON_LABELS[r]}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Action */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Next Action</CardTitle>
            {!editingNextAction && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={startEditNextAction}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingNextAction ? (
              <div className="space-y-2">
                <Input value={naTitle} onChange={(e) => setNaTitle(e.target.value)} placeholder="What's next?" />
                <Input type="datetime-local" value={naDue} onChange={(e) => setNaDue(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingNextAction(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveNextAction} disabled={update.isPending}>Save</Button>
                </div>
              </div>
            ) : workflow.next_action_title ? (
              <>
                <p className="text-sm">{workflow.next_action_title}</p>
                {workflow.next_action_due_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due {format(new Date(workflow.next_action_due_at), "MMM d, yyyy h:mm a")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No next action set.</p>
            )}
          </CardContent>
        </Card>

        {/* Blocker */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertOctagon className="h-3.5 w-3.5" />Blocker
            </CardTitle>
            {workflow.is_blocked && !editingBlocker && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearBlocker}>
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingBlocker ? (
              <div className="space-y-2">
                <Select value={bType} onValueChange={(v) => setBType(v as WorkflowBlockerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_BLOCKER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea rows={2} value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="Reason (required)" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingBlocker(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveBlocker} disabled={!bReason.trim() || setBlocker.isPending}>Save</Button>
                </div>
              </div>
            ) : workflow.is_blocked ? (
              <>
                <Badge variant="destructive" className="mb-1.5">{workflow.blocker_type}</Badge>
                <p className="text-sm">{workflow.blocker_reason}</p>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={startEditBlocker}>Mark Blocked</Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pricing Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workflow.linked_client_id ? (
            <>
              <div className="text-sm">
                <span className="text-muted-foreground">Client:</span>{" "}
                <span className="font-medium">{linkedClient?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Reference version:</span>
                <Select
                  value={workflow.reference_version_id ?? ""}
                  onValueChange={(v) => update.mutate({ id: workflow.id, reference_version_id: v || null })}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {referenceVersion && (
                  <span className="text-xs text-muted-foreground">
                    · {format(new Date(referenceVersion.created_at), "MMM d")}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/?clientId=${workflow.linked_client_id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Pricing
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No pricing client linked. Link one from the account header to enable pricing reference.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowChecklist items={checklist} currentStage={workflow.stage} />
        </CardContent>
      </Card>

      {/* Stage history */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stage History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs">
              {history.slice(0, 5).map((h: any) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {format(new Date(h.changed_at), "MMM d, yyyy")}
                  </span>
                  <span>{h.from_stage ?? "—"} → <strong>{h.to_stage}</strong></span>
                  {h.reason && <span className="text-muted-foreground">· {h.reason}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <WorkflowStageModal open={showStageModal} onOpenChange={setShowStageModal} workflow={workflow} checklist={checklist} />
      <TaskForm open={showTaskForm} onOpenChange={setShowTaskForm} accountId={account.id} contacts={contacts} opportunities={opportunities} />
    </div>
  );
}
