export type Currency = "INR" | "USD";

export type DiscountScope = "base" | "overages" | "both";

export type TemplateName = "jeena_seekho" | "india_general";

export interface PricingInputs {
  template: TemplateName;
  expectedVisits: number;
  includedVisits: number;
  basePrice: number;
  overagePrice: number;
  costPerVisit: number;
  implementationCost: number;
  followUpCost: number;
  discountScope: DiscountScope;
  ltvScenarioIndex: number; // 0=Base, 1=10%, 2=20%, etc.
  actualVisits: number;
  notes: string;
}

export interface FxState {
  rate: number;
  source: "API" | "Manual";
  updatedAt: string;
}

export const DISCOUNT_TIERS = [0, 0.1, 0.2, 0.3, 0.4, 0.5] as const;
export const DISCOUNT_LABELS = ["Base", "10% Off", "20% Off", "30% Off", "40% Off", "50% Off"] as const;

export interface TierResult {
  monthlyBase: number;
  monthlyOverage: number;
  monthlyTotal: number;
  includedVisits: number;
  effectivePricePerVisit: number;
  annualPrice: number;
  monthlyRevenue: number;
  monthlyCost: number;
  monthlyProfit: number;
  marginPercent: number;
  annualProfit: number;
}

export interface Snapshot {
  name: string;
  timestamp: number;
  inputs: PricingInputs;
  currency: Currency;
  fxRate: number;
}
