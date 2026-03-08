import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PricingInputs, Currency } from "@/types/pricing";
import { getTemplateDefaults } from "@/utils/templates";
import { calculateAllTiers } from "@/utils/calculations";
import { exportToExcel } from "@/utils/exportExcel";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useAuth } from "@/contexts/AuthContext";
import { useClients, useVersions } from "@/hooks/useClients";
import { TopBar } from "@/components/pricing/TopBar";
import { PricingSidebar } from "@/components/pricing/PricingSidebar";
import { PricingSummaryTable } from "@/components/pricing/PricingSummaryTable";
import { OverageAnalysis } from "@/components/pricing/OverageAnalysis";
import { UnitEconomicsTable } from "@/components/pricing/UnitEconomicsTable";
import { ImplementationSummaryTable } from "@/components/pricing/ImplementationSummaryTable";

const Index = () => {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const [inputs, setInputs] = useState<PricingInputs>(getTemplateDefaults("jeena_seekho"));
  const [currency, setCurrency] = useState<Currency>("INR");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const { fxState, setManualRate } = useExchangeRate();

  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const { data: clients = [] } = useClients();
  const { data: versions = [] } = useVersions(activeClientId);

  // Auto-select first client/version on load
  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam && clients.some((c) => c.id === clientIdParam)) {
      setActiveClientId(clientIdParam);
    } else if (!activeClientId && clients.length > 0) {
      setActiveClientId(clients[0].id);
    }
  }, [clients, activeClientId, searchParams]);

  useEffect(() => {
    if (activeClientId && !activeVersionId && versions.length > 0) {
      setActiveVersionId(versions[0].id);
      setInputs(versions[0].data as PricingInputs);
    }
  }, [versions, activeClientId, activeVersionId]);

  const tiers = calculateAllTiers(inputs);
  const effectiveRole = role === "admin" && isPresentationMode ? "employee" : role;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        currency={currency}
        setCurrency={setCurrency}
        fxState={fxState}
        onManualRate={setManualRate}
        onExport={() => exportToExcel(inputs, fxState)}
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={() => setIsPresentationMode((p) => !p)}
      />
      <div className="flex flex-1 overflow-hidden">
        <PricingSidebar
          inputs={inputs}
          setInputs={setInputs}
          role={effectiveRole}
          activeClientId={activeClientId}
          activeVersionId={activeVersionId}
          setActiveClientId={setActiveClientId}
          setActiveVersionId={setActiveVersionId}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <PricingSummaryTable tiers={tiers} inputs={inputs} currency={currency} fxRate={fxState.rate} />
            <OverageAnalysis inputs={inputs} currency={currency} fxRate={fxState.rate} />
            {effectiveRole === "admin" && (
              <UnitEconomicsTable tiers={tiers} currency={currency} fxRate={fxState.rate} />
            )}
            <ImplementationSummaryTable inputs={inputs} tiers={tiers} currency={currency} fxRate={fxState.rate} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
