import { useState } from "react";
import { PricingInputs, Currency } from "@/types/pricing";
import { calculateOverageScenarios } from "@/utils/calculations";
import { formatCurrency, formatNumber } from "@/utils/formatting";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  inputs: PricingInputs;
  currency: Currency;
  fxRate: number;
}

export function OverageAnalysis({ inputs, currency, fxRate }: Props) {
  const [open, setOpen] = useState(false);

  if (inputs.actualVisits <= inputs.includedVisits) return null;

  const overage = inputs.actualVisits - inputs.includedVisits;
  const scenarios = calculateOverageScenarios(inputs, 0);
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between border-b bg-table-header px-4 py-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h3 className="text-sm font-semibold">Overage Analysis</h3>
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {formatNumber(overage)} overage
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"} details</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Scenario</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Excess Visits</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Overage Cost</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.label} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{s.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatNumber(s.visits)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatNumber(s.excessVisits)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(s.overageCost)}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(s.totalMonthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
