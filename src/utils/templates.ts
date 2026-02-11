import { PricingInputs, TemplateName } from "@/types/pricing";

export const TEMPLATES: Record<TemplateName, Omit<PricingInputs, "template" | "notes" | "ltvScenarioIndex" | "discountScope">> = {
  jeena_seekho: {
    expectedVisits: 20000,
    includedVisits: 20000,
    basePrice: 1000000,
    overagePrice: 75,
    costPerVisit: 10,
    implementationCost: 500000,
    followUpCost: 100000,
    actualVisits: 20000,
  },
  india_general: {
    expectedVisits: 50000,
    includedVisits: 50000,
    basePrice: 2500000,
    overagePrice: 60,
    costPerVisit: 8,
    implementationCost: 750000,
    followUpCost: 150000,
    actualVisits: 50000,
  },
};

export function getTemplateDefaults(template: TemplateName): PricingInputs {
  return {
    template,
    ...TEMPLATES[template],
    discountScope: "both",
    ltvScenarioIndex: 0,
    notes: "",
  };
}
