import { PricingInputs, Currency } from "@/types/pricing";
import { calculateOverageScenarios } from "@/utils/calculations";
import { formatCurrency, formatNumber } from "@/utils/formatting";

interface Props {
  inputs: PricingInputs;
  currency: Currency;
  fxRate: number;
}

export function OverageAnalysis({ inputs, currency, fxRate }: Props) {
  if (inputs.actualVisits <= inputs.includedVisits) return null;

  const scenarios = calculateOverageScenarios(inputs, 0); // Base discount for overage table
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-table-header px-4 py-2.5">
        <h3 className="text-sm font-semibold">Overage Analysis</h3>
        <p className="text-xs text-muted-foreground">Volume scenarios at base pricing (no discount)</p>
      </div>
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
    </div>
  );
}
