import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useWorkflowRecords } from "@/hooks/useWorkflowRecords";
import { useCrmAccounts } from "@/hooks/useCrmAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { WorkflowList } from "@/components/crm/WorkflowList";
import { WorkflowBoard } from "@/components/crm/WorkflowBoard";
import { WorkflowSeedReview } from "@/components/crm/WorkflowSeedReview";
import { WORKFLOW_STAGES, type WorkflowStage, getAttentionReasons } from "@/types/workflow";

type View = "all" | "queue" | "attention" | "board" | "seed";

export default function WorkflowPage() {
  const { user } = useAuth();
  const { data: workflows = [], isLoading } = useWorkflowRecords();
  const { data: accounts = [] } = useCrmAccounts();
  const [view, setView] = useState<View>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const accountsById = useMemo(() => {
    const map: Record<string, any> = {};
    accounts.forEach((a) => (map[a.id] = a));
    return map;
  }, [accounts]);

  const filtered = useMemo(() => {
    let list = workflows;
    if (view === "queue") list = list.filter((w) => w.owner_id === user?.id);
    if (view === "attention") list = list.filter((w) => getAttentionReasons(w).length > 0);
    if (stageFilter !== "all") list = list.filter((w) => w.stage === (stageFilter as WorkflowStage));
    return list;
  }, [workflows, view, stageFilter, user?.id]);

  const counts = useMemo(() => {
    const active = workflows.filter((w) => w.stage !== "Lost").length;
    const attention = workflows.filter((w) => getAttentionReasons(w).length > 0).length;
    const blocked = workflows.filter((w) => w.is_blocked).length;
    const ready = workflows.filter((w) => !w.is_blocked && getAttentionReasons(w).length === 0).length;
    return { active, attention, blocked, ready };
  }, [workflows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Workflow</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Operational progression of CRM accounts from lead through onboarding and collections.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Activity className="h-4 w-4" />} label="Active Workflows" value={counts.active} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Needs Attention" value={counts.attention} />
        <SummaryCard icon={<AlertOctagon className="h-4 w-4" />} label="Blocked" value={counts.blocked} />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Ready to Move" value={counts.ready} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="queue">My Queue</TabsTrigger>
            <TabsTrigger value="attention">Needs Attention</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="seed">Seed Review</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== "board" && view !== "seed" && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {WORKFLOW_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {view === "board" ? (
        <WorkflowBoard workflows={filtered} accountsById={accountsById} />
      ) : view === "seed" ? (
        <WorkflowSeedReview workflows={workflows} accountsById={accountsById} />
      ) : (
        <WorkflowList workflows={filtered} accountsById={accountsById} isLoading={isLoading} />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
