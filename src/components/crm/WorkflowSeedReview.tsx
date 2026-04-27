import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { WorkflowStageBadge } from "./WorkflowStageBadge";
import { useUpdateSeedConfidence } from "@/hooks/useWorkflowSeed";
import type { WorkflowRecord } from "@/types/workflow";
import type { CrmAccount } from "@/types/crm";

interface Props {
  workflows: WorkflowRecord[];
  accountsById: Record<string, CrmAccount>;
}

const confidenceColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  inferred: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  needs_review: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function WorkflowSeedReview({ workflows, accountsById }: Props) {
  const navigate = useNavigate();
  const updateConfidence = useUpdateSeedConfidence();

  // Only show seeded records (those that have a seed_confidence value)
  const seeded = workflows.filter((w) => w.seed_confidence !== null);

  if (seeded.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No seeded workflows pending review.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Records imported via the seed utility will appear here for confirmation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            These workflows were imported from notes/screenshots. Review each one and confirm or mark for further review.
            "Edit" opens the account where you can adjust stage, next action, blocker, and pricing reference.
          </p>
        </div>
      </div>

      {seeded.map((w) => {
        const account = accountsById[w.account_id];
        return (
          <Card key={w.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {account?.name ?? "Unknown account"}
                  <WorkflowStageBadge stage={w.stage} />
                  {w.seed_confidence && (
                    <Badge variant="secondary" className={confidenceColors[w.seed_confidence]}>
                      {w.seed_confidence.replace("_", " ")}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateConfidence.mutate({ id: w.id, confidence: "confirmed" })}
                    disabled={w.seed_confidence === "confirmed"}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => account && navigate(`/crm/accounts/${account.id}`)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateConfidence.mutate({ id: w.id, confidence: "needs_review" })}
                    disabled={w.seed_confidence === "needs_review"}
                  >
                    Needs Review
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5">
              {w.next_action_title && (
                <div>
                  <span className="text-muted-foreground">Next action:</span>{" "}
                  <span>{w.next_action_title}</span>
                </div>
              )}
              {w.is_blocked && (
                <div>
                  <span className="text-muted-foreground">Blocker:</span>{" "}
                  <Badge variant="destructive" className="text-[10px] py-0">{w.blocker_type}</Badge>
                  {w.blocker_reason && <span className="ml-1.5">{w.blocker_reason}</span>}
                </div>
              )}
              {w.seed_notes && (
                <div className="rounded-md bg-muted p-2 mt-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Seed notes</p>
                  <p className="whitespace-pre-wrap">{w.seed_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
