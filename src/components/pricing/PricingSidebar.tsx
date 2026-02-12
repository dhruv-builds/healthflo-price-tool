import { PricingInputs, DiscountScope } from "@/types/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ClientLibrary } from "@/components/pricing/ClientLibrary";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SidebarProps {
  inputs: PricingInputs;
  setInputs: (inputs: PricingInputs) => void;
  role: "admin" | "employee" | null;
  activeClientId: string | null;
  activeVersionId: string | null;
  setActiveClientId: (id: string | null) => void;
  setActiveVersionId: (id: string | null) => void;
}

function formatIndian(val: number): string {
  const str = Math.round(Math.abs(val)).toString();
  if (str.length <= 3) return str;
  let result = str.slice(-3);
  let remaining = str.slice(0, -3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + "," + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) result = remaining + "," + result;
  return val < 0 ? "-" + result : result;
}

function NumberInput({ label, value, onChange, prefix, step }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number }) {
  const [focused, setFocused] = useState(false);
  const [rawValue, setRawValue] = useState(value.toString());

  useEffect(() => {
    if (!focused) setRawValue(value.toString());
  }, [value, focused]);

  const displayValue = focused ? rawValue : formatIndian(value);

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type={focused ? "number" : "text"}
          value={displayValue}
          step={step}
          onFocus={() => { setFocused(true); setRawValue(value.toString()); }}
          onBlur={() => { setFocused(false); onChange(Number(rawValue) || 0); }}
          onChange={(e) => { setRawValue(e.target.value); if (focused) onChange(Number(e.target.value) || 0); }}
          className={`h-8 text-sm ${prefix ? "pl-6" : ""}`}
        />
      </div>
    </div>
  );
}

export function PricingSidebar({ inputs, setInputs, role, activeClientId, activeVersionId, setActiveClientId, setActiveVersionId }: SidebarProps) {
  const { signOut, user } = useAuth();
  const update = (partial: Partial<PricingInputs>) => setInputs({ ...inputs, ...partial });

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-r bg-sidebar p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-primary">Configuration</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="h-6 w-6 p-0">
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Client Library */}
      <ClientLibrary
        inputs={inputs}
        setInputs={setInputs}
        activeClientId={activeClientId}
        activeVersionId={activeVersionId}
        setActiveClientId={setActiveClientId}
        setActiveVersionId={setActiveVersionId}
      />

      <Separator className="my-3" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Inputs</p>

      <div className="space-y-3 mb-4">
        <NumberInput label="Included Visits in Base" value={inputs.includedVisits} onChange={(v) => update({ includedVisits: v })} />
        <NumberInput label="Base Price/Month" value={inputs.basePrice} onChange={(v) => update({ basePrice: v })} prefix="₹" />
        <NumberInput label="Overage Price/Visit" value={inputs.overagePrice} onChange={(v) => update({ overagePrice: v })} prefix="₹" />
        {role === "admin" && (
          <NumberInput label="Cost to Company/Visit" value={inputs.costPerVisit} onChange={(v) => update({ costPerVisit: v })} prefix="₹" />
        )}
      </div>

      <Separator className="my-2" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">One-Time Costs</p>

      <div className="space-y-3 mb-4">
        <NumberInput label="Number of Hospitals" value={inputs.numberOfHospitals} onChange={(v) => update({ numberOfHospitals: Math.max(1, Math.round(v)) })} step={1} />
        <NumberInput label="Implementation Cost (First Hospital)" value={inputs.implementationCostFirstHospital} onChange={(v) => update({ implementationCostFirstHospital: v })} prefix="₹" />
        <NumberInput label="Follow-up Cost (Per Additional Hospital)" value={inputs.followUpCostPerAdditional} onChange={(v) => update({ followUpCostPerAdditional: v })} prefix="₹" />
      </div>

      <Separator className="my-2" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract Logic</p>

      <div className="space-y-3 mb-4">
        <div className="space-y-1">
          <Label className="text-xs">Discount Scope</Label>
          <Select value={inputs.discountScope} onValueChange={(v) => update({ discountScope: v as DiscountScope })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base Only</SelectItem>
              <SelectItem value="overages">Overages Only</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-2" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overage Modeling</p>

      <div className="space-y-3 mb-4">
        <NumberInput label="Actual Visits" value={inputs.actualVisits} onChange={(v) => update({ actualVisits: v })} />
        {inputs.actualVisits > inputs.includedVisits && (
          <p className="text-xs text-warning font-medium">⚠ {formatIndian(inputs.actualVisits - inputs.includedVisits)} overage visits</p>
        )}
      </div>

      <Separator className="my-2" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
      <Textarea
        value={inputs.notes}
        onChange={(e) => update({ notes: e.target.value })}
        placeholder="Deal context, client info..."
        className="text-xs min-h-[80px]"
      />
    </aside>
  );
}
