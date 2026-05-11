import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Download,
  FileDown,
  Loader2,
  Save as SaveIcon,
  Trash2,
  GripVertical,
  EyeOff,
  Eye,
  Plus,
} from "lucide-react";
import {
  CommercialDocStatus,
  DocumentDoc,
  STATUS_LABELS,
  STATUS_TONES,
  Block,
  Section,
  computeUnresolvedFields,
  newId,
  emptyTiptap,
  migrateLegacyCoverLogos,
  type LogoPlacement,
} from "@/types/commercialDoc";
import { LogoCanvas } from "@/components/commercial/LogoCanvas";
import {
  useCommercialDocument,
  useDocumentExports,
  useDocumentMutations,
  useExportDocument,
} from "@/hooks/useCommercialDocs";
import { RichTextEditor } from "@/components/commercial/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CommercialDocEditor() {
  const { accountId, docId } = useParams<{ accountId: string; docId: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useCommercialDocument(docId ?? null);
  const { data: exports = [] } = useDocumentExports(docId ?? null);
  const { updateDocument } = useDocumentMutations();
  const exportDoc = useExportDocument();

  const [content, setContent] = useState<DocumentDoc | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<CommercialDocStatus>("draft");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (doc && !content) {
      setContent(migrateLegacyCoverLogos(doc.content_json as DocumentDoc));
      setTitle(doc.title);
      setStatus(doc.status);
    }
  }, [doc, content]);

  // Autosave
  useEffect(() => {
    if (!dirty || !docId || !content) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await updateDocument.mutateAsync({
          id: docId,
          patch: { content_json: content, title, status } as any,
        });
        setDirty(false);
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [dirty, content, title, status, docId, updateDocument]);

  const unresolved = useMemo(
    () => (content ? computeUnresolvedFields(content) : []),
    [content]
  );

  if (isLoading || !content || !doc) {
    return <div className="p-6 text-sm text-muted-foreground">Loading document…</div>;
  }

  const update = (patch: (prev: DocumentDoc) => DocumentDoc) => {
    setContent((prev) => (prev ? patch(prev) : prev));
    setDirty(true);
  };

  const handleExport = async (fmt: "pdf" | "docx") => {
    if (!docId) return;
    try {
      // Save first
      if (dirty) {
        await updateDocument.mutateAsync({
          id: docId,
          patch: { content_json: content, title, status } as any,
        });
        setDirty(false);
      }
      const res = await exportDoc.mutateAsync({ documentId: docId, format: fmt });
      window.open(res.signedUrl, "_blank");
      toast.success(`${fmt.toUpperCase()} exported`);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/crm/accounts/${accountId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            className="h-8 max-w-md font-medium"
          />
          <Badge variant="outline" className="text-xs">{doc.doc_type === "mou" ? "MoU" : "Pricing Addendum"}</Badge>
          <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</> : dirty ? "Unsaved" : "Saved"}
          <Select value={status} onValueChange={(v) => { setStatus(v as CommercialDocStatus); setDirty(true); }}>
            <SelectTrigger className="h-7 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as CommercialDocStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => handleExport("docx")} disabled={exportDoc.isPending}>
            <FileDown className="h-3.5 w-3.5 mr-1" />DOCX
          </Button>
          <Button size="sm" onClick={() => handleExport("pdf")} disabled={exportDoc.isPending}>
            <Download className="h-3.5 w-3.5 mr-1" />PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: outline + checklist */}
        <aside className="col-span-3 space-y-3">
          <Card className="p-3">
            <div className="text-xs font-medium mb-2">Outline</div>
            <ul className="space-y-1 text-xs">
              {content.cover && <li className="text-muted-foreground">Cover page</li>}
              {content.sections?.map((s) => (
                <li key={s.id} className="text-muted-foreground">{s.title}</li>
              ))}
              {content.blocks?.map((b) => (
                <li key={b.id} className="text-muted-foreground flex items-center gap-1">
                  {b.hidden && <EyeOff className="h-3 w-3" />}
                  {("title" in b && b.title) || b.kind}
                </li>
              ))}
              {content.signature && <li className="text-muted-foreground">Signature page</li>}
            </ul>
          </Card>
          <Card className="p-3">
            <div className="text-xs font-medium mb-2">
              Completion checklist {unresolved.length > 0 && <span className="text-amber-600">({unresolved.length})</span>}
            </div>
            {unresolved.length === 0 ? (
              <p className="text-xs text-muted-foreground">All structured fields filled.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {unresolved.map((u) => (
                  <li key={u.path} className="text-amber-700 dark:text-amber-400">• {u.label}</li>
                ))}
              </ul>
            )}
          </Card>
          {exports.length > 0 && (
            <Card className="p-3">
              <div className="text-xs font-medium mb-2">Recent exports</div>
              <ul className="space-y-1 text-xs">
                {exports.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <button
                      className="text-primary hover:underline"
                      onClick={async () => {
                        const { data, error } = await supabase.storage
                          .from("crm-files")
                          .createSignedUrl(e.file_path, 3600);
                        if (error) return toast.error(error.message);
                        window.open(data.signedUrl, "_blank");
                      }}
                    >
                      {e.format.toUpperCase()} · {format(new Date(e.exported_at), "MMM d HH:mm")}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        {/* Center: editors */}
        <main className="col-span-9 space-y-4">
          {content.cover && (
            <CoverEditor cover={content.cover} onChange={(c) => update((p) => ({ ...p, cover: c }))} />
          )}
          {content.sections?.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              onChange={(next) =>
                update((p) => ({
                  ...p,
                  sections: p.sections!.map((x, j) => (j === i ? next : x)),
                }))
              }
            />
          ))}
          {content.blocks && (
            <BlocksEditor
              blocks={content.blocks}
              onChange={(blocks) => update((p) => ({ ...p, blocks }))}
            />
          )}
          {content.signature && (
            <SignatureEditor
              sig={content.signature}
              onChange={(sig) => update((p) => ({ ...p, signature: sig }))}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ----- Cover -----
function CoverEditor({ cover, onChange }: { cover: NonNullable<DocumentDoc["cover"]>; onChange: (c: NonNullable<DocumentDoc["cover"]>) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-semibold">Cover page</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" value={cover.title} onChange={(v) => onChange({ ...cover, title: v })} />
        <Field label="Subtitle" value={cover.subtitle ?? ""} onChange={(v) => onChange({ ...cover, subtitle: v })} />
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <PartyEditor label="First Party (Vendor)" party={cover.vendorParty} onChange={(p) => onChange({ ...cover, vendorParty: p })} />
          <PartyEditor label="Second Party (Client)" party={cover.clientParty} onChange={(p) => onChange({ ...cover, clientParty: p })} />
        </div>
        <Field label="Execution location (city, state, country)" value={cover.executionLocation ?? ""} onChange={(v) => onChange({ ...cover, executionLocation: v })} />
        <div className="space-y-1">
          <Label className="text-xs">Variant</Label>
          <Select value={cover.variant} onValueChange={(v) => onChange({ ...cover, variant: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="branded_split">Branded split (recommended)</SelectItem>
              <SelectItem value="two_party_centered">Two party · centered</SelectItem>
              <SelectItem value="two_party_left">Two party · left</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Spacing</Label>
          <Select value={cover.spacing} onValueChange={(v) => onChange({ ...cover, spacing: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

function PartyEditor({ label, party, onChange }: { label: string; party: { legalName: string; address?: string }; onChange: (p: any) => void }) {
  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="text-xs font-medium">{label}</div>
      <Field label="Legal name" value={party.legalName} onChange={(v) => onChange({ ...party, legalName: v })} />
      <Field label="Address" value={party.address ?? ""} onChange={(v) => onChange({ ...party, address: v })} multiline />
    </div>
  );
}

// ----- MoU sections (with optional subsections + facility coverage) -----
function SectionEditor({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const hasSubs = !!section.subsections && section.subsections.length > 0;
  return (
    <Card className="p-4 space-y-3">
      <Input
        value={section.title}
        onChange={(e) => onChange({ ...section, title: e.target.value, customized: true })}
        className="font-semibold"
      />
      {!hasSubs && (
        <RichTextEditor
          value={section.body}
          onChange={(body) => onChange({ ...section, body, customized: true })}
        />
      )}
      {hasSubs && (
        <div className="space-y-3">
          {section.subsections!.map((ss, j) => (
            <div key={ss.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">{ss.number ?? `${j + 1}`}</Badge>
                <Input
                  value={ss.title}
                  onChange={(e) => {
                    const subs = section.subsections!.map((x, k) => k === j ? { ...x, title: e.target.value } : x);
                    onChange({ ...section, subsections: subs, customized: true });
                  }}
                  className="h-7 text-sm font-medium"
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onChange({ ...section, subsections: section.subsections!.filter((_, k) => k !== j), customized: true })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <RichTextEditor
                value={ss.body}
                onChange={(body) => {
                  const subs = section.subsections!.map((x, k) => k === j ? { ...x, body } : x);
                  onChange({ ...section, subsections: subs, customized: true });
                }}
              />
            </div>
          ))}
          <Button size="sm" variant="outline"
            onClick={() => onChange({
              ...section,
              subsections: [...section.subsections!, { id: newId(), title: "New subsection", body: emptyTiptap() }],
              customized: true,
            })}>
            <Plus className="h-3 w-3 mr-1" />Add subsection
          </Button>
        </div>
      )}
      {section.coverage && (
        <CoverageEditor coverage={section.coverage} onChange={(coverage) => onChange({ ...section, coverage, customized: true })} />
      )}
    </Card>
  );
}

function CoverageEditor({ coverage, onChange }: { coverage: NonNullable<Section["coverage"]>; onChange: (c: NonNullable<Section["coverage"]>) => void }) {
  const flag = coverage.totalCount == null || coverage.rows.length === 0;
  return (
    <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">Coverage of Facilities (3.2)</div>
        {flag && <span className="text-[10px] text-amber-700 dark:text-amber-400">⚠ needs client values</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-1">
          <Label className="text-xs">Total facility count</Label>
          <Input type="number" min={0} value={coverage.totalCount ?? ""}
            onChange={(e) => onChange({ ...coverage, totalCount: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground">Facility types</div>
        {coverage.rows.length === 0 && <p className="text-xs text-muted-foreground italic">No facility types added yet.</p>}
        {coverage.rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
            <Input className="col-span-2 h-8" type="number" min={0} placeholder="Count" value={row.count ?? ""}
              onChange={(e) => {
                const rows = coverage.rows.map((r, j) => j === i ? { ...r, count: e.target.value === "" ? undefined : Number(e.target.value) } : r);
                onChange({ ...coverage, rows });
              }} />
            <Input className="col-span-3 h-8" placeholder="Label" value={row.label}
              onChange={(e) => {
                const rows = coverage.rows.map((r, j) => j === i ? { ...r, label: e.target.value } : r);
                onChange({ ...coverage, rows });
              }} />
            <Input className="col-span-6 h-8" placeholder="Description" value={row.description ?? ""}
              onChange={(e) => {
                const rows = coverage.rows.map((r, j) => j === i ? { ...r, description: e.target.value } : r);
                onChange({ ...coverage, rows });
              }} />
            <Button size="sm" variant="ghost" className="col-span-1 h-8 w-8 p-0 text-destructive"
              onClick={() => onChange({ ...coverage, rows: coverage.rows.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline"
          onClick={() => onChange({ ...coverage, rows: [...coverage.rows, { id: newId(), label: "", count: undefined }] })}>
          <Plus className="h-3 w-3 mr-1" />Add facility type
        </Button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <RichTextEditor value={coverage.notes ?? emptyTiptap()} onChange={(notes) => onChange({ ...coverage, notes })} />
      </div>
    </div>
  );
}

// ----- Addendum blocks -----
function BlocksEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const updateBlock = (i: number, next: Block) => onChange(blocks.map((b, j) => (j === i ? next : b)));
  const removeBlock = (i: number) => onChange(blocks.filter((_, j) => j !== i));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  const addBlock = (kind: Block["kind"]) => {
    const base: Record<string, Block> = {
      header: { id: newId(), kind: "header", title: "Section header" },
      text: { id: newId(), kind: "text", title: "Text", body: emptyTiptap() },
      pricing_table: { id: newId(), kind: "pricing_table", title: "Pricing", currency: "INR", rows: [] },
      discount_summary: { id: newId(), kind: "discount_summary", title: "Discount summary", rows: [] },
      comparison: { id: newId(), kind: "comparison", title: "Comparison", columns: ["A", "B"], rows: [] },
      narrative: { id: newId(), kind: "narrative", title: "Narrative", topic: "notes", body: emptyTiptap() },
      signature: { id: newId(), kind: "signature", signatory: { legalName: "", signatoryName: "", designation: "" } },
      custom_section: { id: newId(), kind: "custom_section", title: "Custom section", primitives: [] },
    };
    onChange([...blocks, base[kind]]);
  };

  return (
    <>
      {blocks.map((b, i) => (
        <Card key={b.id} className={`p-4 space-y-2 ${b.hidden ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">{b.kind}</Badge>
              {"title" in b && b.title && <span className="text-sm font-semibold">{b.title}</span>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveBlock(i, -1)}>↑</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveBlock(i, 1)}>↓</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateBlock(i, { ...b, hidden: !b.hidden } as Block)}>
                {b.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeBlock(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <BlockBody block={b} onChange={(next) => updateBlock(i, next)} />
        </Card>
      ))}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Add block:</span>
          {(["header", "text", "pricing_table", "discount_summary", "comparison", "narrative", "signature", "custom_section"] as Block["kind"][]).map((k) => (
            <Button key={k} size="sm" variant="outline" onClick={() => addBlock(k)}>
              <Plus className="h-3 w-3 mr-1" />{k}
            </Button>
          ))}
        </div>
      </Card>
    </>
  );
}

function BlockBody({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.kind) {
    case "header":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Title" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Subtitle" value={block.subtitle ?? ""} onChange={(v) => onChange({ ...block, subtitle: v })} />
        </div>
      );
    case "text":
    case "narrative":
      return (
        <div className="space-y-2">
          <Field label="Title" value={(block as any).title ?? ""} onChange={(v) => onChange({ ...(block as any), title: v })} />
          <RichTextEditor value={block.body} onChange={(body) => onChange({ ...block, body })} />
        </div>
      );
    case "pricing_table":
      return (
        <div className="space-y-2">
          <Field label="Title" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <table className="w-full text-xs">
            <thead className="border-b">
              <tr>
                <th className="text-left p-1">Tier</th>
                <th className="text-left p-1">Visits</th>
                <th className="text-left p-1">Base</th>
                <th className="text-left p-1">Overage</th>
                <th className="text-left p-1">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b">
                  {(["tier", "includedVisits", "monthlyBase", "overagePrice", "monthlyTotal"] as const).map((k) => (
                    <td key={k} className="p-1">
                      <Input
                        className="h-7 text-xs"
                        value={(r as any)[k] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const numeric = k !== "tier";
                          const rows = block.rows.map((rr, j) => j === i ? { ...rr, [k]: numeric ? (v === "" ? undefined : Number(v)) : v } : rr);
                          onChange({ ...block, rows, customized: true });
                        }}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onChange({ ...block, rows: block.rows.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...block, rows: [...block.rows, { tier: "" }] })}>
            <Plus className="h-3 w-3 mr-1" />Add row
          </Button>
        </div>
      );
    case "discount_summary":
      return <pre className="text-xs text-muted-foreground">Discount summary editor — auto-populated when generated from pricing.</pre>;
    case "comparison":
      return <pre className="text-xs text-muted-foreground">Comparison editor — coming in v2.</pre>;
    case "signature":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Legal name" value={block.signatory.legalName} onChange={(v) => onChange({ ...block, signatory: { ...block.signatory, legalName: v } })} />
          <Field label="Signatory name" value={block.signatory.signatoryName} onChange={(v) => onChange({ ...block, signatory: { ...block.signatory, signatoryName: v } })} />
          <Field label="Designation" value={block.signatory.designation} onChange={(v) => onChange({ ...block, signatory: { ...block.signatory, designation: v } })} />
          <Field label="Date" value={block.signatory.date ?? ""} onChange={(v) => onChange({ ...block, signatory: { ...block.signatory, date: v } })} />
        </div>
      );
    case "custom_section":
      return (
        <div className="space-y-2">
          <Field label="Section title" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <p className="text-xs text-muted-foreground">Custom-section primitives editor coming next iteration; data shape preserved.</p>
        </div>
      );
  }
}

// ----- Signature page -----
function SignatureEditor({ sig, onChange }: { sig: NonNullable<DocumentDoc["signature"]>; onChange: (s: NonNullable<DocumentDoc["signature"]>) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-semibold">Signature page</div>
      <Field
        label="Witness clause"
        value={sig.witnessClause ?? ""}
        onChange={(v) => onChange({ ...sig, witnessClause: v })}
        multiline
      />
      <div className="grid grid-cols-2 gap-3">
        {(["partyA", "partyB"] as const).map((k) => (
          <div key={k} className="space-y-2 rounded-md border p-2">
            <div className="text-xs font-medium">{k === "partyA" ? "First Party (Vendor)" : "Second Party (Client)"}</div>
            <Field label="Legal name" value={sig[k].legalName} onChange={(v) => onChange({ ...sig, [k]: { ...sig[k], legalName: v } })} />
            <Field label="Signatory name" value={sig[k].signatoryName} onChange={(v) => onChange({ ...sig, [k]: { ...sig[k], signatoryName: v } })} />
            <Field label="Designation" value={sig[k].designation} onChange={(v) => onChange({ ...sig, [k]: { ...sig[k], designation: v } })} />
            <Field label="Date" value={sig[k].date ?? ""} onChange={(v) => onChange({ ...sig, [k]: { ...sig[k], date: v } })} />
          </div>
        ))}
      </div>
      <Field label="Closing note" value={sig.closingNote ?? ""} onChange={(v) => onChange({ ...sig, closingNote: v })} multiline />
    </Card>
  );
}

// ----- Field helper -----
function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
