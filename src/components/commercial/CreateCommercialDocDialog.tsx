import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CommercialDocType,
  CommercialGenerationMode,
  GENERATION_MODE_LABELS,
  TYPE_LABELS,
} from "@/types/commercialDoc";
import {
  TemplateRow,
  useCommercialAccountProfile,
  useCommercialTemplates,
  useDocumentMutations,
  useTemplateCurrentVersion,
} from "@/hooks/useCommercialDocs";
import { useClients, useVersions } from "@/hooks/useClients";
import {
  emptyAddendumTemplate,
  emptyMouTemplate,
  generateInitialContent,
} from "@/utils/commercialDocGenerator";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  accountName: string;
  defaultLinkedClientId?: string | null;
}

export function CreateCommercialDocDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  defaultLinkedClientId,
}: Props) {
  const [docType, setDocType] = useState<CommercialDocType>("mou");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string>("__skeleton__");
  const [mode, setMode] = useState<CommercialGenerationMode>("structure_only");
  const [linkedClientId, setLinkedClientId] = useState<string | null>(
    defaultLinkedClientId ?? null
  );
  const [linkedVersionId, setLinkedVersionId] = useState<string | null>(null);

  const { data: profile } = useCommercialAccountProfile(accountId);
  const { data: templates = [] } = useCommercialTemplates({
    doc_type: docType,
    account_id: accountId,
  });
  const publishedTemplates = templates.filter((t) => t.status === "published");
  const realTemplateId = templateId === "__skeleton__" ? null : templateId;
  const { data: tplVersion } = useTemplateCurrentVersion(realTemplateId);
  const { data: clients = [] } = useClients();
  const { data: versions = [] } = useVersions(linkedClientId);
  const { createDocument } = useDocumentMutations();
  const navigate = useNavigate();

  // Reset on open
  useEffect(() => {
    if (open) {
      setDocType("mou");
      setTitle("");
      setTemplateId("__skeleton__");
      setMode("structure_only");
      setLinkedClientId(defaultLinkedClientId ?? null);
      setLinkedVersionId(null);
    }
  }, [open, defaultLinkedClientId]);

  // Default mode when type changes / template chosen
  useEffect(() => {
    if (tplVersion) {
      const tpl = publishedTemplates.find((t) => t.id === realTemplateId);
      if (tpl) setMode(tpl.default_generation_mode);
    } else {
      setMode(docType === "pricing_addendum" ? "auto_from_pricing" : "structure_only");
    }
  }, [tplVersion, docType, realTemplateId, publishedTemplates]);

  const submit = async () => {
    const baseTemplate =
      tplVersion?.structure_json ??
      (docType === "mou" ? emptyMouTemplate() : emptyAddendumTemplate());

    const versionRow = versions.find((v) => v.id === linkedVersionId);
    const content = generateInitialContent({
      template: baseTemplate,
      mode,
      profile,
      pricing: versionRow ? { name: versionRow.name, data: versionRow.data } : null,
      accountName,
    });

    const finalTitle =
      title.trim() ||
      `${TYPE_LABELS[docType]} — ${accountName} — ${new Date().toLocaleDateString()}`;

    if (mode === "auto_from_pricing" && docType === "pricing_addendum" && !linkedVersionId) {
      toast.error("Pick a pricing version, or switch to Structure-only mode");
      return;
    }

    const created = await createDocument.mutateAsync({
      account_id: accountId,
      doc_type: docType,
      title: finalTitle,
      template_id: realTemplateId,
      template_version_id: tplVersion?.id ?? null,
      generation_mode: mode,
      linked_client_id: linkedClientId,
      linked_version_id: linkedVersionId,
      content,
      profile_snapshot: (profile as any) ?? {},
    });
    onOpenChange(false);
    navigate(`/crm/accounts/${accountId}/docs/${created.id}`);
  };

  const showPricing = docType === "pricing_addendum";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New commercial document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Document type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as CommercialDocType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mou">MoU</SelectItem>
                <SelectItem value="pricing_addendum">Pricing Addendum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__skeleton__">Built-in skeleton</SelectItem>
                {publishedTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.scope === "account" ? "· account variant" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Generation mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as CommercialGenerationMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(GENERATION_MODE_LABELS) as CommercialGenerationMode[]).map((m) => (
                  <SelectItem key={m} value={m}>{GENERATION_MODE_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showPricing && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Linked pricing client</Label>
                <Select
                  value={linkedClientId ?? "__none__"}
                  onValueChange={(v) => {
                    setLinkedClientId(v === "__none__" ? null : v);
                    setLinkedVersionId(null);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {linkedClientId && (
                <div className="space-y-1">
                  <Label className="text-xs">Pricing version</Label>
                  <Select
                    value={linkedVersionId ?? "__none__"}
                    onValueChange={(v) => setLinkedVersionId(v === "__none__" ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select version" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Document title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${TYPE_LABELS[docType]} — ${accountName}`}
            />
          </div>

          {!profile && (
            <p className="rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
              No commercial defaults set for this account. The document will use placeholders for
              party names, logos, and signatories. Set defaults from the Commercial Docs tab.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createDocument.isPending}>
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
