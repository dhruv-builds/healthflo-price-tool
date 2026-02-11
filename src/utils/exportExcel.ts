import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { PricingInputs, DISCOUNT_LABELS, Currency, FxState } from "@/types/pricing";
import { calculateAllTiers, calculateLTV, calculateOverageScenarios } from "./calculations";
import { formatCurrency, formatPercent } from "./formatting";

export function exportToExcel(inputs: PricingInputs, fxState: FxState) {
  const tiers = calculateAllTiers(inputs);
  const wb = XLSX.utils.book_new();

  const buildSheet = (currency: Currency, rate: number) => {
    const fmt = (v: number) => {
      if (currency === "USD") return `$${Math.round(v / rate).toLocaleString("en-US")}`;
      return `₹${Math.round(v).toLocaleString("en-IN")}`;
    };

    const rows: any[][] = [];
    rows.push(["HealthFlo Enterprise Pricing — " + (currency === "INR" ? "INR View" : "USD View")]);
    rows.push([]);

    // Pricing Summary
    rows.push(["Pricing Summary", ...DISCOUNT_LABELS]);
    rows.push(["Monthly Price", ...tiers.map((t) => fmt(t.monthlyTotal))]);
    rows.push(["Included Visits", ...tiers.map((t) => t.includedVisits)]);
    rows.push(["Effective ₹/Visit", ...tiers.map((t) => fmt(t.effectivePricePerVisit))]);
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

    // LTV
    const ltv = calculateLTV(inputs, inputs.ltvScenarioIndex);
    rows.push([`Contract LTV (${DISCOUNT_LABELS[inputs.ltvScenarioIndex]})`, "Month 1", "Year 1", "Year 2", "Year 3"]);
    ltv.rows.forEach((r) => {
      rows.push([r.label, fmt(r.month1), fmt(r.year1), fmt(r.year2), fmt(r.year3)]);
    });
    rows.push(["Payback Period", `${ltv.paybackMonths} months`]);

    return XLSX.utils.aoa_to_sheet(rows);
  };

  XLSX.utils.book_append_sheet(wb, buildSheet("INR", 1), "INR View");
  XLSX.utils.book_append_sheet(wb, buildSheet("USD", fxState.rate), "USD View");

  // Inputs tab
  const inputRows: any[][] = [
    ["HealthFlo — Input Summary"],
    [],
    ["Parameter", "Value"],
    ["Template", inputs.template === "jeena_seekho" ? "Jeena Seekho Enterprise" : "India General Pricing"],
    ["Expected Visits/Month", inputs.expectedVisits],
    ["Included Visits", inputs.includedVisits],
    ["Base Price/Month (₹)", inputs.basePrice],
    ["Overage Price/Visit (₹)", inputs.overagePrice],
    ["Cost to Company/Visit (₹)", inputs.costPerVisit],
    ["Implementation Cost (₹)", inputs.implementationCost],
    ["Follow-up Cost (₹)", inputs.followUpCost],
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
