import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STAGES, type WorkflowRecord, getAttentionReasons } from "@/types/workflow";
import type { CrmAccount } from "@/types/crm";

interface Props {
  workflows: WorkflowRecord[];
  accountsById: Record<string, CrmAccount>;
}

export function WorkflowBoard({ workflows, accountsById }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {WORKFLOW_STAGES.map((stage) => {
        const items = workflows.filter((w) => w.stage === stage);
        return (
          <div key={stage} className="w-64 flex-shrink-0 rounded-md bg-muted/50 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide">{stage}</h3>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((w) => {
                const account = accountsById[w.account_id];
                const attention = getAttentionReasons(w);
                return (
                  <button
                    key={w.id}
                    onClick={() => account && navigate(`/crm/accounts/${account.id}`)}
                    className="w-full rounded-md border bg-card p-2.5 text-left text-sm shadow-sm hover:bg-accent transition-colors"
                  >
                    <p className="font-medium truncate">{account?.name ?? "—"}</p>
                    {w.next_action_title && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">{w.next_action_title}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {w.is_blocked && <Badge variant="destructive" className="text-[10px] py-0">Blocked</Badge>}
                      {attention.length > 0 && !w.is_blocked && (
                        <Badge variant="outline" className="text-[10px] py-0 border-amber-400 text-amber-900 dark:text-amber-200">
                          Attention
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
              {items.length === 0 && (
                <p className="px-1 py-2 text-[11px] text-muted-foreground">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
