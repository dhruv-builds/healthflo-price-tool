import { PricingInputs, TemplateName } from "@/types/pricing";

export const TEMPLATES: Record<TemplateName, Omit<PricingInputs, "template" | "notes" | "discountScope">> = {
  jeena_seekho: {
    includedVisits: 20000,
    basePrice: 1000000,
    overagePrice: 75,
    costPerVisit: 10,
    numberOfHospitals: 1,
    implementationCostFirstHospital: 500000,
    followUpCostPerAdditional: 100000,
    actualVisits: 20000,
  },
  india_general: {
    includedVisits: 50000,
    basePrice: 2500000,
    overagePrice: 60,
    costPerVisit: 8,
    numberOfHospitals: 1,
    implementationCostFirstHospital: 750000,
    followUpCostPerAdditional: 150000,
    actualVisits: 50000,
  },
};

export function getTemplateDefaults(template: TemplateName): PricingInputs {
  return {
    template,
    ...TEMPLATES[template],
    discountScope: "both",
    notes: "",
  };
}
