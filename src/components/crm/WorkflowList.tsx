import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { WorkflowStageBadge } from "./WorkflowStageBadge";
import { getAttentionReasons, type WorkflowRecord } from "@/types/workflow";
import type { CrmAccount } from "@/types/crm";

interface Props {
  workflows: WorkflowRecord[];
  accountsById: Record<string, CrmAccount>;
  isLoading: boolean;
}

export function WorkflowList({ workflows, accountsById, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  if (workflows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No workflow records yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Initialize a workflow from any CRM account detail page to start tracking progress.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Next Action</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attention</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {workflows.map((w) => {
            const account = accountsById[w.account_id];
            const attention = getAttentionReasons(w);
            return (
              <TableRow
                key={w.id}
                className="cursor-pointer"
                onClick={() => account && navigate(`/crm/accounts/${account.id}`)}
              >
                <TableCell className="font-medium">{account?.name ?? "—"}</TableCell>
                <TableCell><WorkflowStageBadge stage={w.stage} /></TableCell>
                <TableCell className="text-xs">
                  {w.next_action_title || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.next_action_due_at ? format(new Date(w.next_action_due_at), "MMM d") : "—"}
                </TableCell>
                <TableCell>
                  {w.is_blocked ? (
                    <Badge variant="destructive">Blocked</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(w.stage_entered_at), { addSuffix: true })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {attention.length > 0 ? (
                    <Badge variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-200">
                      {attention.length} flag{attention.length > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300">OK</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">→</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
