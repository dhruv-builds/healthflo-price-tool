import { TierResult, PricingInputs, DISCOUNT_LABELS, Currency, DISCOUNT_TIERS } from "@/types/pricing";
import { formatCurrency, formatNumber } from "@/utils/formatting";

interface Props {
  tiers: TierResult[];
  inputs: PricingInputs;
  currency: Currency;
  fxRate: number;
}

export function PricingSummaryTable({ tiers, inputs, currency, fxRate }: Props) {
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
            {/* Section 1: Monthly Breakdown */}
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Monthly Base Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.monthlyBase)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Overage Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.monthlyOverage)}</td>
              ))}
            </tr>
            <tr className="border-b-2 border-border">
              <td className="px-4 py-2 font-semibold">Total Monthly Price</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(t.monthlyTotal)}</td>
              ))}
            </tr>

            {/* Section 2: Unit Rates */}
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Base Price per Visit</td>
              {tiers.map((t, i) => {
                const basePricePerVisit = t.includedVisits > 0 ? t.monthlyBase / t.includedVisits : 0;
                return <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(basePricePerVisit)}</td>;
              })}
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 font-medium">Overage Price per Visit</td>
              {DISCOUNT_TIERS.map((discount, i) => {
                const overageDiscount = inputs.discountScope === "base" ? 0 : discount;
                const discountedOverageRate = inputs.overagePrice * (1 - overageDiscount);
                return <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(discountedOverageRate)}</td>;
              })}
            </tr>
            <tr className="border-b-2 border-border">
              <td className="px-4 py-2 font-medium">Effective Price per Visit</td>
              {tiers.map((t, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums">{fmt(t.effectivePricePerVisit)}</td>
              ))}
            </tr>

            {/* Section 3: Annual */}
            <tr>
              <td className="px-4 py-2 font-semibold">Annual Price</td>
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
