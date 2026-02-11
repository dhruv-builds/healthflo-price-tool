import { useEffect, useState, useCallback } from "react";
import { FxState } from "@/types/pricing";

export function useExchangeRate() {
  const [fxState, setFxState] = useState<FxState>({
    rate: 84.0,
    source: "Manual",
    updatedAt: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data?.rates?.INR) {
          setFxState({
            rate: Math.round(data.rates.INR * 100) / 100,
            source: "API",
            updatedAt: new Date().toLocaleTimeString(),
          });
        }
      } catch {
        // Keep default
      }
    };
    fetchRate();
  }, []);

  const setManualRate = useCallback((rate: number) => {
    setFxState({
      rate,
      source: "Manual",
      updatedAt: new Date().toLocaleTimeString(),
    });
  }, []);

  return { fxState, setManualRate };
}
