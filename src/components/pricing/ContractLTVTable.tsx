import { PricingInputs, DISCOUNT_LABELS, Currency } from "@/types/pricing";
import { calculateLTV } from "@/utils/calculations";
import { formatCurrency, getMarginColor } from "@/utils/formatting";

interface Props {
  inputs: PricingInputs;
  currency: Currency;
  fxRate: number;
}

export function ContractLTVTable({ inputs, currency, fxRate }: Props) {
  const { rows, paybackMonths } = calculateLTV(inputs, inputs.ltvScenarioIndex);
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);
  const tierLabel = DISCOUNT_LABELS[inputs.ltvScenarioIndex];

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-table-header px-4 py-2.5">
        <h3 className="text-sm font-semibold">Contract LTV — {tierLabel}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metric</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Month 1</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Year 1 (12M)</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Year 2 (24M)</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Year 3 (36M)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b">
                <td className="px-4 py-2 font-medium">{row.label}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${row.label === "Net Profit" ? (row.month1 >= 0 ? "text-success font-semibold" : "text-destructive font-semibold") : ""}`}>
                  {fmt(row.month1)}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${row.label === "Net Profit" ? (row.year1 >= 0 ? "text-success font-semibold" : "text-destructive font-semibold") : ""}`}>
                  {fmt(row.year1)}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${row.label === "Net Profit" ? (row.year2 >= 0 ? "text-success font-semibold" : "text-destructive font-semibold") : ""}`}>
                  {fmt(row.year2)}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${row.label === "Net Profit" ? (row.year3 >= 0 ? "text-success font-semibold" : "text-destructive font-semibold") : ""}`}>
                  {fmt(row.year3)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-4 py-2 font-medium">Payback Period</td>
              <td colSpan={4} className="px-4 py-2 text-right font-semibold text-primary">
                {paybackMonths > 0 ? `${paybackMonths} month${paybackMonths > 1 ? "s" : ""}` : "N/A (unprofitable)"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
