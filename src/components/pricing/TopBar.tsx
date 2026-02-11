import { Currency, FxState } from "@/types/pricing";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TopBarProps {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fxState: FxState;
  onManualRate: (rate: number) => void;
  onExport: () => void;
}

export function TopBar({ currency, setCurrency, fxState, onManualRate, onExport }: TopBarProps) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(fxState.rate.toString());

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">HealthFlo</span>
          <span className="text-xs text-muted-foreground">Enterprise Pricing Tool</span>
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          <span>Currency: <strong className="text-foreground">{currency}</strong></span>
          <span className="text-border">|</span>
          <span>Rate: ₹{editingRate ? (
            <Input
              className="inline h-5 w-16 px-1 text-xs"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(rateInput);
                if (!isNaN(val) && val > 0) onManualRate(val);
                setEditingRate(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = parseFloat(rateInput);
                  if (!isNaN(val) && val > 0) onManualRate(val);
                  setEditingRate(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button onClick={() => { setRateInput(fxState.rate.toString()); setEditingRate(true); }} className="underline decoration-dashed cursor-pointer">
              {fxState.rate.toFixed(2)}
            </button>
          )}</span>
          <span className="text-border">|</span>
          <span>Source: {fxState.source}</span>
          <span className="text-border">|</span>
          <span>Updated: {fxState.updatedAt}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border">
          <button
            onClick={() => setCurrency("INR")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${currency === "INR" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            INR
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${currency === "USD" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            USD
          </button>
        </div>
        <Button size="sm" onClick={onExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export to Excel
        </Button>
      </div>
    </div>
  );
}
