import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { PricingInputs, DISCOUNT_LABELS, DISCOUNT_TIERS, Currency, FxState } from "@/types/pricing";
import { calculateAllTiers, calculateOverageScenarios } from "./calculations";
import { formatPercent } from "./formatting";

export function exportToExcel(inputs: PricingInputs, fxState: FxState) {
  const tiers = calculateAllTiers(inputs);
  const wb = XLSX.utils.book_new();

  const implCost = inputs.implementationCostFirstHospital;
  const followUpCost = Math.max(0, inputs.numberOfHospitals - 1) * inputs.followUpCostPerAdditional;

  const buildSheet = (currency: Currency, rate: number) => {
    const fmt = (v: number) => {
      if (currency === "USD") return `$${Math.round(v / rate).toLocaleString("en-US")}`;
      return `₹${Math.round(v).toLocaleString("en-IN")}`;
    };

    const rows: any[][] = [];
    rows.push(["HealthFlo Enterprise Pricing — " + (currency === "INR" ? "INR View" : "USD View")]);
    rows.push([]);

    // Pricing Summary with enhanced rows
    rows.push(["Pricing Summary", ...DISCOUNT_LABELS]);
    rows.push(["Monthly Base Price", ...tiers.map((t) => fmt(t.monthlyBase))]);
    rows.push(["Overage Price", ...tiers.map((t) => fmt(t.monthlyOverage))]);
    rows.push(["Total Monthly Price", ...tiers.map((t) => fmt(t.monthlyTotal))]);
    rows.push([]);
    rows.push(["Base Price per Visit", ...tiers.map((t) => fmt(t.includedVisits > 0 ? t.monthlyBase / t.includedVisits : 0))]);
    rows.push(["Overage Price per Visit", ...DISCOUNT_TIERS.map((d) => {
      const overageDiscount = inputs.discountScope === "base" ? 0 : d;
      return fmt(inputs.overagePrice * (1 - overageDiscount));
    })]);
    rows.push(["Effective Price per Visit", ...tiers.map((t) => fmt(t.effectivePricePerVisit))]);
    rows.push([]);
    rows.push(["Annual Price", ...tiers.map((t) => fmt(t.annualPrice))]);
    rows.push([]);

    // Unit Economics
    rows.push(["Unit Economics", ...DISCOUNT_LABELS]);
    rows.push(["Monthly Revenue", ...tiers.map((t) => fmt(t.monthlyRevenue))]);
    rows.push(["Monthly Cost", ...tiers.map((t) => fmt(t.monthlyCost))]);
    rows.push(["Monthly Profit", ...tiers.map((t) => fmt(t.monthlyProfit))]);
    rows.push(["Margin %", ...tiers.map((t) => formatPercent(t.marginPercent))]);
    rows.push(["Annual Profit", ...tiers.map((t) => fmt(t.annualProfit))]);
    rows.push([]);

    // Implementation Summary
    rows.push(["Pricing Summary (Including Implementation)", ...DISCOUNT_LABELS]);
    rows.push(["Annual Recurring Price", ...tiers.map((t) => fmt(t.annualPrice))]);
    rows.push(["Implementation Cost (1st Hospital)", ...tiers.map(() => fmt(implCost))]);
    if (inputs.numberOfHospitals > 1) {
      rows.push([`Follow-up Costs (${inputs.numberOfHospitals - 1} Additional)`, ...tiers.map(() => fmt(followUpCost))]);
    }
    rows.push(["Total First-Year Cost", ...tiers.map((t) => fmt(t.annualPrice + implCost + followUpCost))]);

    return XLSX.utils.aoa_to_sheet(rows);
  };

  XLSX.utils.book_append_sheet(wb, buildSheet("INR", 1), "INR View");
  XLSX.utils.book_append_sheet(wb, buildSheet("USD", fxState.rate), "USD View");

  // Inputs tab
  const inputRows: any[][] = [
    ["HealthFlo — Input Summary"],
    [],
    ["Parameter", "Value"],
    ["Included Visits", inputs.includedVisits],
    ["Base Price/Month (₹)", inputs.basePrice],
    ["Overage Price/Visit (₹)", inputs.overagePrice],
    ["Cost to Company/Visit (₹)", inputs.costPerVisit],
    ["Number of Hospitals", inputs.numberOfHospitals],
    ["Implementation Cost - First Hospital (₹)", inputs.implementationCostFirstHospital],
    ["Follow-up Cost - Per Additional Hospital (₹)", inputs.followUpCostPerAdditional],
    ["Discount Scope", inputs.discountScope],
    ["Actual Visits", inputs.actualVisits],
    ["FX Rate (INR/USD)", fxState.rate],
    ["FX Source", fxState.source],
    ["Notes", inputs.notes],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inputRows), "Inputs");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "HealthFlo-Pricing.xlsx");
}
