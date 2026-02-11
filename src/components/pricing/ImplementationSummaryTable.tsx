import { PricingInputs, TierResult, DISCOUNT_LABELS, Currency } from "@/types/pricing";
import { formatCurrency } from "@/utils/formatting";

interface Props {
  inputs: PricingInputs;
  tiers: TierResult[];
  currency: Currency;
  fxRate: number;
}

export function ImplementationSummaryTable({ inputs, tiers, currency, fxRate }: Props) {
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);
  const implCost = inputs.implementationCostFirstHospital;
  const followUpCost = Math.max(0, inputs.numberOfHospitals - 1) * inputs.followUpCostPerAdditional;
  const showFollowUp = inputs.numberOfHospitals > 1;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-table-header px-4 py-2.5">
        <h3 className="text-sm font-semibold">Pricing Summary (Including Implementation)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metric</th>
              {DISCOUNT_LABELS.map((label) => (
                <th key={label} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Annual Recurring Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.annualPrice)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Implementation Cost (1st Hospital)</td>
              {tiers.map((_, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(implCost)}</td>
              ))}
            </tr>
            {showFollowUp && (
              <tr className="border-b">
                <td className="px-4 py-2 font-medium">
                  Follow-up Costs ({inputs.numberOfHospitals - 1} Additional Hospital{inputs.numberOfHospitals - 1 > 1 ? "s" : ""})
                </td>
                {tiers.map((_, i) => (
                  <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(followUpCost)}</td>
                ))}
              </tr>
            )}
            <tr className="bg-primary/10 font-bold">
              <td className="px-4 py-2">Total First-Year Cost</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.annualPrice + implCost + followUpCost)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
