import { TierResult, DISCOUNT_LABELS, Currency } from "@/types/pricing";
import { formatCurrency, formatPercent, getMarginColor, getMarginBg } from "@/utils/formatting";

interface Props {
  tiers: TierResult[];
  currency: Currency;
  fxRate: number;
}

export function UnitEconomicsTable({ tiers, currency, fxRate }: Props) {
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-table-header px-4 py-2.5">
        <h3 className="text-sm font-semibold">Unit Economics</h3>
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
              <td className="px-4 py-2 font-medium">Monthly Revenue</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.monthlyRevenue)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Monthly Cost</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.monthlyCost)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Monthly Profit</td>
              {tiers.map((t, i) => (
                <td key={i} className={`px-4 py-2 text-right font-semibold tabular-nums ${getMarginColor(t.marginPercent)}`}>{fmt(t.monthlyProfit)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Margin %</td>
              {tiers.map((t, i) => (
                <td key={i} className={`px-4 py-2 text-right font-semibold tabular-nums ${getMarginColor(t.marginPercent)}`}>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${getMarginBg(t.marginPercent)}`}>
                    {formatPercent(t.marginPercent)}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium">Annual Profit</td>
              {tiers.map((t, i) => (
                <td key={i} className={`px-4 py-2 text-right font-semibold tabular-nums ${getMarginColor(t.marginPercent)}`}>{fmt(t.annualProfit)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
