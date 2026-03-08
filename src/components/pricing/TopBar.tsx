import { Currency, FxState } from "@/types/pricing";
import { Button } from "@/components/ui/button";
import { Download, Users, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TopBarProps {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fxState: FxState;
  onManualRate: (rate: number) => void;
  onExport: () => void;
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
}

export function TopBar({ currency, setCurrency, fxState, onManualRate, onExport, isPresentationMode, onTogglePresentationMode }: TopBarProps) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(fxState.rate.toString());
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrm = location.pathname.startsWith("/crm");

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">HealthFlo</span>
          <span className="text-xs text-muted-foreground">Enterprise Pricing Tool</span>
        </div>

        {/* Module Switcher */}
        <div className="flex rounded-md border">
          <button
            onClick={() => navigate("/")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${!isCrm ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate("/crm")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${isCrm ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            CRM
          </button>
        </div>

        {!isCrm && (
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
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isCrm && (
          <>
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
            {role === "admin" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onTogglePresentationMode}
                      className={`h-8 w-8 p-0 ${isPresentationMode ? "text-muted-foreground/60" : ""}`}
                    >
                      {isPresentationMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Presentation Mode</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button size="sm" onClick={onExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export to Excel
            </Button>
          </>
        )}
        {role === "admin" && !isPresentationMode && (
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")} className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Manage Users
          </Button>
        )}
      </div>
    </div>
  );
}
