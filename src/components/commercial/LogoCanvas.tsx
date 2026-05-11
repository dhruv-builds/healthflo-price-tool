// LogoCanvas — free-placement drag/resize editor for a single zone.
// Coordinates are stored as percentages of the zone (xPct/yPct/widthPct) so
// they survive any page size at export time.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ImagePlus, ChevronUp, ChevronDown } from "lucide-react";
import { newId, type LogoPlacement, type LogoZone, type LogoLibraryItem } from "@/types/commercialDoc";
import { useResolvedLogoUrls } from "@/hooks/useCommercialLogos";
import { LogoLibraryDialog } from "./LogoLibraryDialog";

interface Props {
  zone: LogoZone;
  /** Aspect ratio width / height of the zone canvas (visual only). */
  zoneAspect: number;
  placements: LogoPlacement[];
  onChange: (next: LogoPlacement[]) => void;
  accountId: string | null;
  /** Optional background label shown faintly inside the canvas. */
  label?: string;
}

/** Resolve the asset path of a placement (logoId from library or direct filePath). */
function pathOf(p: LogoPlacement, library: Record<string, LogoLibraryItem>): string | undefined {
  if (p.logoId && library[p.logoId]) return library[p.logoId].file_path;
  return p.filePath;
}

export function LogoCanvas({ zone, zoneAspect, placements, onChange, accountId, label }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Resolve all referenced asset URLs
  const allPaths = placements.map((p) => p.filePath ?? "").filter(Boolean);
  const urls = useResolvedLogoUrls(allPaths);

  const update = (id: string, patch: Partial<LogoPlacement>) =>
    onChange(placements.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => {
    onChange(placements.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const onAddFromLibrary = (logo: LogoLibraryItem) => {
    const aspect = logo.natural_width && logo.natural_height ? logo.natural_width / logo.natural_height : 1;
    const p: LogoPlacement = {
      id: newId(),
      logoId: logo.id,
      filePath: logo.file_path,
      zone,
      xPct: 35,
      yPct: 35,
      widthPct: zone === "cover" ? 25 : 14,
      rotation: 0,
      opacity: 1,
      aspectRatio: aspect,
    };
    onChange([...placements, p]);
    setSelectedId(p.id);
  };

  // Drag/resize logic: pointer events on rendered placement boxes
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origXPct: number;
    origYPct: number;
    origWPct: number;
    rectW: number;
    rectH: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent, p: LogoPlacement, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    drag.current = {
      id: p.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origXPct: p.xPct,
      origYPct: p.yPct,
      origWPct: p.widthPct,
      rectW: rect.width,
      rectH: rect.height,
    };
    setSelectedId(p.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.mode === "move") {
        const dxPct = (dx / d.rectW) * 100;
        const dyPct = (dy / d.rectH) * 100;
        update(d.id, {
          xPct: Math.max(0, Math.min(95, d.origXPct + dxPct)),
          yPct: Math.max(0, Math.min(95, d.origYPct + dyPct)),
        });
      } else {
        const dwPct = (dx / d.rectW) * 100;
        update(d.id, { widthPct: Math.max(3, Math.min(100 - d.origXPct, d.origWPct + dwPct)) });
      }
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements]);

  const selected = placements.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium capitalize">{label ?? `${zone} logos`}</div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPickerOpen(true)}>
          <Plus className="h-3 w-3" /> Add logo
        </Button>
      </div>
      <div
        ref={canvasRef}
        className="relative rounded-md border-2 border-dashed border-border bg-muted/20 overflow-hidden select-none"
        style={{ aspectRatio: zoneAspect }}
        onClick={() => setSelectedId(null)}
      >
        {placements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-1">
            <ImagePlus className="h-3.5 w-3.5" /> Drag logos here after adding from the library
          </div>
        )}
        {placements.map((p) => {
          const path = p.filePath;
          const url = path ? urls.data?.[path] : undefined;
          const aspect = p.aspectRatio ?? 1;
          const widthPct = p.widthPct;
          // height is widthPct / aspect, but expressed as % of canvas height
          const heightPct = (widthPct / aspect) * (zoneAspect / 1);
          const isSel = p.id === selectedId;
          return (
            <div
              key={p.id}
              onPointerDown={(e) => onPointerDown(e, p, "move")}
              className={`absolute cursor-move group ${isSel ? "ring-2 ring-primary" : "ring-1 ring-border/40"}`}
              style={{
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                transform: `rotate(${p.rotation ?? 0}deg)`,
                opacity: p.opacity ?? 1,
                zIndex: p.zIndex ?? 1,
              }}
            >
              {url ? (
                <img src={url} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  loading…
                </div>
              )}
              {isSel && (
                <div
                  onPointerDown={(e) => onPointerDown(e, p, "resize")}
                  className="absolute -right-1 -bottom-1 h-3 w-3 bg-primary rounded-sm cursor-nwse-resize"
                  title="Resize"
                />
              )}
            </div>
          );
        })}
      </div>
      {selected && (
        <div className="rounded-md border bg-card p-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium text-muted-foreground">Selected logo</div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(selected.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="X %" value={selected.xPct} onChange={(v) => update(selected.id, { xPct: v })} />
            <NumField label="Y %" value={selected.yPct} onChange={(v) => update(selected.id, { yPct: v })} />
            <NumField label="Width %" value={selected.widthPct} onChange={(v) => update(selected.id, { widthPct: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Rotation: {selected.rotation ?? 0}°</Label>
            <Slider
              value={[selected.rotation ?? 0]}
              onValueChange={([v]) => update(selected.id, { rotation: v })}
              min={-180} max={180} step={1}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Opacity: {((selected.opacity ?? 1) * 100).toFixed(0)}%</Label>
            <Slider
              value={[(selected.opacity ?? 1) * 100]}
              onValueChange={([v]) => update(selected.id, { opacity: v / 100 })}
              min={5} max={100} step={5}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-6 px-2 gap-1 text-[11px]"
              onClick={() => update(selected.id, { zIndex: (selected.zIndex ?? 1) + 1 })}>
              <ChevronUp className="h-3 w-3" /> Front
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 gap-1 text-[11px]"
              onClick={() => update(selected.id, { zIndex: Math.max(0, (selected.zIndex ?? 1) - 1) })}>
              <ChevronDown className="h-3 w-3" /> Back
            </Button>
          </div>
        </div>
      )}
      <LogoLibraryDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        accountId={accountId}
        onPick={onAddFromLibrary}
      />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <input
        type="number"
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
      />
    </div>
  );
}
