import { useState } from "react";
import { PricingInputs, Currency } from "@/types/pricing";
import { getTemplateDefaults } from "@/utils/templates";
import { calculateAllTiers } from "@/utils/calculations";
import { exportToExcel } from "@/utils/exportExcel";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { TopBar } from "@/components/pricing/TopBar";
import { PricingSidebar } from "@/components/pricing/PricingSidebar";
import { PricingSummaryTable } from "@/components/pricing/PricingSummaryTable";
import { OverageAnalysis } from "@/components/pricing/OverageAnalysis";
import { UnitEconomicsTable } from "@/components/pricing/UnitEconomicsTable";
import { ContractLTVTable } from "@/components/pricing/ContractLTVTable";

const Index = () => {
  const [inputs, setInputs] = useState<PricingInputs>(getTemplateDefaults("jeena_seekho"));
  const [currency, setCurrency] = useState<Currency>("INR");
  const { fxState, setManualRate } = useExchangeRate();

  const tiers = calculateAllTiers(inputs);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        currency={currency}
        setCurrency={setCurrency}
        fxState={fxState}
        onManualRate={setManualRate}
        onExport={() => exportToExcel(inputs, fxState)}
      />
      <div className="flex flex-1 overflow-hidden">
        <PricingSidebar inputs={inputs} setInputs={setInputs} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <PricingSummaryTable tiers={tiers} currency={currency} fxRate={fxState.rate} />
            <OverageAnalysis inputs={inputs} currency={currency} fxRate={fxState.rate} />
            <UnitEconomicsTable tiers={tiers} currency={currency} fxRate={fxState.rate} />
            <ContractLTVTable inputs={inputs} currency={currency} fxRate={fxState.rate} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
