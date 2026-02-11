import { PricingInputs, TierResult, DISCOUNT_TIERS, DiscountScope } from "@/types/pricing";

export function calculateTier(inputs: PricingInputs, discountRate: number): TierResult {
  const { basePrice, includedVisits, actualVisits, overagePrice, costPerVisit, discountScope } = inputs;

  const baseDiscount = discountScope === "overages" ? 0 : discountRate;
  const monthlyBase = basePrice * (1 - baseDiscount);

  let monthlyOverage = 0;
  if (actualVisits > includedVisits) {
    const excess = actualVisits - includedVisits;
    const overageDiscount = discountScope === "base" ? 0 : discountRate;
    monthlyOverage = excess * overagePrice * (1 - overageDiscount);
  }

  const monthlyTotal = monthlyBase + monthlyOverage;
  const effectivePricePerVisit = actualVisits > 0 ? monthlyTotal / actualVisits : 0;
  const annualPrice = monthlyTotal * 12;

  const monthlyRevenue = monthlyTotal;
  const monthlyCost = actualVisits * costPerVisit;
  const monthlyProfit = monthlyRevenue - monthlyCost;
  const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
  const annualProfit = monthlyProfit * 12;

  return {
    monthlyBase,
    monthlyOverage,
    monthlyTotal,
    includedVisits,
    effectivePricePerVisit,
    annualPrice,
    monthlyRevenue,
    monthlyCost,
    monthlyProfit,
    marginPercent,
    annualProfit,
  };
}

export function calculateAllTiers(inputs: PricingInputs): TierResult[] {
  return DISCOUNT_TIERS.map((rate) => calculateTier(inputs, rate));
}

export interface OverageScenario {
  label: string;
  visits: number;
  excessVisits: number;
  overageCost: number;
  totalMonthly: number;
}

export function calculateOverageScenarios(inputs: PricingInputs, discountRate: number): OverageScenario[] {
  const { includedVisits, overagePrice, basePrice, discountScope } = inputs;
  const baseDiscount = discountScope === "overages" ? 0 : discountRate;
  const overageDiscount = discountScope === "base" ? 0 : discountRate;
  const discountedBase = basePrice * (1 - baseDiscount);
  const discountedOverageRate = overagePrice * (1 - overageDiscount);

  const multipliers = [
    { label: "Included", factor: 1 },
    { label: "+10%", factor: 1.1 },
    { label: "+25%", factor: 1.25 },
    { label: "+50%", factor: 1.5 },
    { label: "+100%", factor: 2 },
  ];

  return multipliers.map(({ label, factor }) => {
    const visits = Math.round(includedVisits * factor);
    const excess = Math.max(0, visits - includedVisits);
    const overageCost = excess * discountedOverageRate;
    return {
      label,
      visits,
      excessVisits: excess,
      overageCost,
      totalMonthly: discountedBase + overageCost,
    };
  });
}
