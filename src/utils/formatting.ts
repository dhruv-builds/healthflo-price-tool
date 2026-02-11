import { Currency } from "@/types/pricing";

export function formatCurrency(value: number, currency: Currency, fxRate: number): string {
  if (currency === "USD") {
    const usd = value / fxRate;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usd);
  }
  return formatINR(value);
}

function formatINR(value: number): string {
  const absVal = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absVal >= 10000000) {
    const cr = absVal / 10000000;
    if (cr === Math.floor(cr)) return `${sign}₹${cr.toFixed(0)} Cr`;
    return `${sign}₹${cr.toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    const lakh = absVal / 100000;
    if (lakh === Math.floor(lakh)) return `${sign}₹${lakh.toFixed(0)}L`;
    return `${sign}₹${lakh.toFixed(2)}L`;
  }
  
  // Indian number formatting
  const str = Math.round(absVal).toString();
  let result = "";
  const len = str.length;
  
  if (len <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + "," + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + "," + result;
    }
  }
  
  return `${sign}₹${result}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getMarginColor(margin: number): string {
  if (margin < 0) return "text-destructive";
  if (margin <= 10) return "text-warning";
  return "text-success";
}

export function getMarginBg(margin: number): string {
  if (margin < 0) return "bg-destructive/10";
  if (margin <= 10) return "bg-warning/10";
  return "bg-success/10";
}
