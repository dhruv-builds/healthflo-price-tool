import { PricingInputs, DiscountScope, TemplateName, Snapshot } from "@/types/pricing";
import { getTemplateDefaults } from "@/utils/templates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SidebarProps {
  inputs: PricingInputs;
  setInputs: (inputs: PricingInputs) => void;
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

export function PricingSidebar({ inputs, setInputs }: SidebarProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("healthflo-snapshots");
    if (saved) setSnapshots(JSON.parse(saved));
  }, []);

  const update = (partial: Partial<PricingInputs>) => setInputs({ ...inputs, ...partial });

  const handleTemplateChange = (v: string) => {
    const defaults = getTemplateDefaults(v as TemplateName);
    setInputs({ ...defaults, notes: inputs.notes });
  };

  const saveSnapshot = () => {
    const name = snapshotName.trim() || `Snapshot ${snapshots.length + 1}`;
    const snap: Snapshot = { name, timestamp: Date.now(), inputs, currency: "INR", fxRate: 84 };
    const updated = [...snapshots, snap];
    setSnapshots(updated);
    localStorage.setItem("healthflo-snapshots", JSON.stringify(updated));
    setSnapshotName("");
    toast.success(`Saved "${name}"`);
  };

  const loadSnapshot = (snap: Snapshot) => {
    setInputs(snap.inputs);
    toast.success(`Loaded "${snap.name}"`);
  };

  const deleteSnapshot = (idx: number) => {
    const updated = snapshots.filter((_, i) => i !== idx);
    setSnapshots(updated);
    localStorage.setItem("healthflo-snapshots", JSON.stringify(updated));
    toast.success("Snapshot deleted");
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-r bg-sidebar p-4">
      <h2 className="mb-4 text-sm font-bold text-primary">Configuration</h2>

      {/* Template */}
      <div className="space-y-1 mb-4">
        <Label className="text-xs">Template</Label>
        <Select value={inputs.template} onValueChange={handleTemplateChange}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="jeena_seekho">Jeena Seekho Enterprise</SelectItem>
            <SelectItem value="india_general">India General Pricing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-2" />
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Inputs</p>

      <div className="space-y-3 mb-4">
        <NumberInput label="Included Visits in Base" value={inputs.includedVisits} onChange={(v) => update({ includedVisits: v })} />
        <NumberInput label="Base Price/Month" value={inputs.basePrice} onChange={(v) => update({ basePrice: v })} prefix="₹" />
        <NumberInput label="Overage Price/Visit" value={inputs.overagePrice} onChange={(v) => update({ overagePrice: v })} prefix="₹" />
        <NumberInput label="Cost to Company/Visit" value={inputs.costPerVisit} onChange={(v) => update({ costPerVisit: v })} prefix="₹" />
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
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snapshots</p>

      <div className="flex gap-1 mb-2">
        <Input value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="Snapshot name" className="h-7 text-xs" />
        <Button size="sm" variant="outline" onClick={saveSnapshot} className="h-7 px-2 shrink-0">
          <Save className="h-3 w-3" />
        </Button>
      </div>
      {snapshots.length > 0 && (
        <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
          {snapshots.map((snap, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <button onClick={() => loadSnapshot(snap)} className="flex-1 truncate text-left hover:text-primary">
                <FolderOpen className="mr-1 inline h-3 w-3" />{snap.name}
              </button>
              <button onClick={() => deleteSnapshot(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

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
