import { TierResult, DISCOUNT_LABELS, Currency } from "@/types/pricing";
import { formatCurrency, formatNumber, getMarginColor, getMarginBg } from "@/utils/formatting";

interface Props {
  tiers: TierResult[];
  currency: Currency;
  fxRate: number;
}

export function PricingSummaryTable({ tiers, currency, fxRate }: Props) {
  const fmt = (v: number) => formatCurrency(v, currency, fxRate);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-table-header px-4 py-2.5">
        <h3 className="text-sm font-semibold">Pricing Summary</h3>
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
              <td className="px-4 py-2 font-medium">Monthly Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.monthlyTotal)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Included Visits</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{formatNumber(t.includedVisits)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Effective Price/Visit</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.effectivePricePerVisit)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium">Annual Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(t.annualPrice)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
