import { useState } from "react";
import { CrmOpportunity, CRM_OPP_STAGES, CrmOppStage } from "@/types/crm";
import { useCreateOpportunity, useUpdateOpportunity } from "@/hooks/useCrmOpportunities";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";

const stageColors: Record<string, string> = {
  Prospecting: "bg-gray-100 text-gray-700",
  Discovery: "bg-blue-100 text-blue-700",
  Demo: "bg-indigo-100 text-indigo-700",
  Proposal: "bg-purple-100 text-purple-700",
  Pricing: "bg-orange-100 text-orange-700",
  Negotiation: "bg-yellow-100 text-yellow-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

interface OpportunitySectionProps {
  accountId: string;
  accountName: string;
  opportunities: CrmOpportunity[];
  isLoading: boolean;
}

export function OpportunitySection({ accountId, accountName, opportunities, isLoading }: OpportunitySectionProps) {
  const { user } = useAuth();
  const createOpp = useCreateOpportunity();
  const updateOpp = useUpdateOpportunity();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(`${accountName} Opportunity`);
  const [stage, setStage] = useState<CrmOppStage>("Prospecting");
  const [expectedValue, setExpectedValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-md bg-muted" />;
  }

  if (opportunities.length === 0 && !creating) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No active opportunity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create one when this account becomes commercially active.</p>
        <Button className="mt-3" size="sm" onClick={() => setCreating(true)}>
          <TrendingUp className="h-3.5 w-3.5 mr-1" />Create Opportunity
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opportunity name" />
        <Select value={stage} onValueChange={(v) => setStage(v as CrmOppStage)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CRM_OPP_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" placeholder="Expected value" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
          <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
        </div>
        <Input placeholder="Next step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
        <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
          <Button size="sm" disabled={!name || createOpp.isPending} onClick={async () => {
            if (!user) return;
            await createOpp.mutateAsync({
              account_id: accountId,
              name,
              stage,
              owner_id: user.id,
              expected_value: expectedValue ? parseFloat(expectedValue) : null,
              expected_close_date: closeDate || null,
              next_step: nextStep || null,
              notes: notes || null,
              created_by: user.id,
              updated_by: user.id,
            });
            setCreating(false);
          }}>Create Opportunity</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opp) => (
        <div key={opp.id} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{opp.name}</span>
              <Badge className={stageColors[opp.stage] || ""}>{opp.stage}</Badge>
            </div>
            <Select
              value={opp.stage}
              onValueChange={async (v) => {
                await updateOpp.mutateAsync({ id: opp.id, stage: v as CrmOppStage, updated_by: user?.id ?? null });
              }}
            >
              <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CRM_OPP_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {opp.expected_value && <span>Value: ₹{opp.expected_value.toLocaleString()}</span>}
            {opp.expected_close_date && <span>Close: {format(new Date(opp.expected_close_date), "MMM d, yyyy")}</span>}
          </div>
          {opp.next_step && <p className="text-xs"><strong>Next:</strong> {opp.next_step}</p>}
          {opp.notes && <p className="text-xs text-muted-foreground">{opp.notes}</p>}
        </div>
      ))}
    </div>
  );
}
