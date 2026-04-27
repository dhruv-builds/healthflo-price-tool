import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CommercialDocType,
  CommercialGenerationMode,
  GENERATION_MODE_LABELS,
  TYPE_LABELS,
} from "@/types/commercialDoc";
import {
  TemplateRow,
  useCommercialTemplates,
  useTemplateMutations,
} from "@/hooks/useCommercialDocs";
import {
  emptyAddendumTemplate,
  emptyMouTemplate,
} from "@/utils/commercialDocGenerator";
import { Copy, FileText, Plus, Sparkles, Upload } from "lucide-react";
import { format } from "date-fns";

const STATUS_TONES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  archived: "bg-muted text-muted-foreground line-through",
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useCommercialTemplates();
  const { createTemplate, updateTemplate, duplicateTemplate, publishNewVersion } =
    useTemplateMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<TemplateRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TemplateRow | null>(null);

  const hasMouSeed = templates.some(
    (t) => t.doc_type === "mou" && t.scope === "global"
  );
  const hasAddendumSeed = templates.some(
    (t) => t.doc_type === "pricing_addendum" && t.scope === "global"
  );

  const seedSkeletons = async () => {
    if (!hasMouSeed) {
      await createTemplate.mutateAsync({
        name: "Jeena Seekho — MoU (Skeleton)",
        doc_type: "mou",
        scope: "global",
        description:
          "Standard 12-section MoU skeleton. Edit clauses to match your final legal text, then publish.",
        default_generation_mode: "structure_only",
        initial_structure: emptyMouTemplate(),
      });
    }
    if (!hasAddendumSeed) {
      await createTemplate.mutateAsync({
        name: "Jeena Seekho — Pricing Addendum (Skeleton)",
        doc_type: "pricing_addendum",
        scope: "global",
        description:
          "Pricing Addendum skeleton with tier table, discount summary, infrastructure, compliance, SLA, and signature blocks.",
        default_generation_mode: "auto_from_pricing",
        initial_structure: emptyAddendumTemplate(),
      });
    }
    setSeedOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Commercial Templates</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Manage reusable MoU and Pricing Addendum templates. Drafts are private; publish a
            version to make a template available when creating new documents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(!hasMouSeed || !hasAddendumSeed) && (
            <Button variant="outline" onClick={() => setSeedOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Seed Jeena Seekho skeletons
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New template
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No templates yet. Seed the Jeena Seekho skeletons to get started, or create your
              own from scratch.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Default mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                        {t.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[t.doc_type]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {t.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {GENERATION_MODE_LABELS[t.default_generation_mode]}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_TONES[t.status] ?? STATUS_TONES.draft
                      }`}
                    >
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(t.updated_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {t.status === "draft" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateTemplate.mutate({
                              id: t.id,
                              patch: { status: "published" },
                            })
                          }
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Publish
                        </Button>
                      )}
                      {t.status === "published" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateTemplate.mutate({
                              id: t.id,
                              patch: { status: "draft" },
                            })
                          }
                        >
                          Unpublish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDuplicateTarget(t)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {t.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setArchiveTarget(t)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Tip: Templates define structure and default clauses. Per-document edits during drafting
        do not modify the template. To roll improvements back into a template, edit it here and
        save a new published version.
      </p>

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          await createTemplate.mutateAsync({
            name: input.name,
            doc_type: input.doc_type,
            scope: "global",
            description: input.description,
            default_generation_mode: input.default_generation_mode,
            initial_structure:
              input.doc_type === "mou" ? emptyMouTemplate() : emptyAddendumTemplate(),
          });
        }}
      />

      <Dialog open={!!duplicateTarget} onOpenChange={(v) => !v && setDuplicateTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate template</DialogTitle>
          </DialogHeader>
          <DuplicateForm
            source={duplicateTarget}
            onSubmit={async (name) => {
              if (!duplicateTarget) return;
              await duplicateTemplate.mutateAsync({
                sourceId: duplicateTarget.id,
                name,
                scope: "global",
              });
              setDuplicateTarget(null);
            }}
            onCancel={() => setDuplicateTarget(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived templates won't appear in the New Document picker. Existing documents are
              unaffected. You can unarchive later by editing the template's status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!archiveTarget) return;
                await updateTemplate.mutateAsync({
                  id: archiveTarget.id,
                  patch: { status: "archived" },
                });
                setArchiveTarget(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seedOpen} onOpenChange={setSeedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed Jeena Seekho skeletons?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates draft templates for the standard 12-section MoU and the Pricing
              Addendum. They use placeholder clauses — review and replace with your final legal
              text before publishing. This is safe to run once; existing seeded templates are
              skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={seedSkeletons}>Seed templates</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: {
    name: string;
    doc_type: CommercialDocType;
    description: string;
    default_generation_mode: CommercialGenerationMode;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState<CommercialDocType>("mou");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<CommercialGenerationMode>("structure_only");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        doc_type: docType,
        description: description.trim(),
        default_generation_mode: mode,
      });
      setName("");
      setDescription("");
      setDocType("mou");
      setMode("structure_only");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard MoU v2"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Document type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as CommercialDocType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mou">MoU</SelectItem>
                <SelectItem value="pricing_addendum">Pricing Addendum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default generation mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as CommercialGenerationMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GENERATION_MODE_LABELS) as CommercialGenerationMode[]).map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {GENERATION_MODE_LABELS[m]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            New templates start from the built-in skeleton. You can edit any document created
            from this template freely.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            Create as draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DuplicateForm({
  source,
  onSubmit,
  onCancel,
}: {
  source: TemplateRow | null;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(source ? `${source.name} (copy)` : "");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">New template name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(name.trim());
            } finally {
              setBusy(false);
            }
          }}
        >
          Duplicate
        </Button>
      </DialogFooter>
    </>
  );
}
