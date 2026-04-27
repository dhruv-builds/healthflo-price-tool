import { useState } from "react";
import { useClients, useVersions, useClientMutations, Client, Version } from "@/hooks/useClients";
import { PricingInputs } from "@/types/pricing";
import { getTemplateDefaults } from "@/utils/templates";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Save, Plus, Copy, Trash2, Pencil, FolderOpen, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PricingLinkPrompt } from "@/components/crm/PricingLinkPrompt";

interface Props {
  inputs: PricingInputs;
  setInputs: (inputs: PricingInputs) => void;
  activeClientId: string | null;
  activeVersionId: string | null;
  setActiveClientId: (id: string | null) => void;
  setActiveVersionId: (id: string | null) => void;
}

export function ClientLibrary({ inputs, setInputs, activeClientId, activeVersionId, setActiveClientId, setActiveVersionId }: Props) {
  const { role } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const { data: versions = [] } = useVersions(activeClientId);
  const { createClient, renameClient, duplicateClient, deleteClient, saveVersion, createVersion } = useClientMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Pricing → CRM linking prompt (after first save of a brand-new client)
  const [linkPrompt, setLinkPrompt] = useState<{ id: string; name: string } | null>(null);
  const [skippedClientIds, setSkippedClientIds] = useState<Set<string>>(new Set());

  const activeClient = clients.find((c) => c.id === activeClientId);
  const activeVersion = versions.find((v) => v.id === activeVersionId);

  const handleSelectVersion = (client: Client, version: Version) => {
    setActiveClientId(client.id);
    setActiveVersionId(version.id);
    setInputs(version.data as PricingInputs);
    setDialogOpen(false);
  };

  const handleSave = () => {
    if (!activeVersionId) return;
    saveVersion.mutate({ id: activeVersionId, data: inputs, notes: inputs.notes });
  };

  const handleSaveAs = () => {
    if (!activeClientId) return;
    const name = newName.trim() || `v${versions.length + 1}`;
    createVersion.mutate(
      { clientId: activeClientId, name, data: inputs, notes: newNotes },
      {
        onSuccess: (v) => {
          setActiveVersionId(v.id);
          setSaveAsOpen(false);
          setNewName("");
          setNewNotes("");
        },
      }
    );
  };

  const handleNewClient = () => {
    const name = newName.trim();
    if (!name) { toast.error("Name required"); return; }
    const defaults = getTemplateDefaults("jeena_seekho");
    createClient.mutate(
      { name, data: defaults },
      {
        onSuccess: (c) => {
          setActiveClientId(c.id);
          setNewClientOpen(false);
          setNewName("");
          // Trigger CRM linking prompt after first-save of a brand-new client
          if (!skippedClientIds.has(c.id)) {
            setLinkPrompt({ id: c.id, name: c.name });
          }
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Current client display */}
      <div className="rounded-md border bg-muted/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Active Client</p>
        <p className="text-sm font-medium truncate">{activeClient?.name ?? "None selected"}</p>
        {activeVersion && <p className="text-xs text-muted-foreground">{activeVersion.name}</p>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1">
              <FolderOpen className="h-3 w-3" /> Select Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">Client Library</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1 mb-2" onClick={() => { setNewClientOpen(true); setDialogOpen(false); setNewName(""); }}>
                <Plus className="h-3 w-3" /> New Client
              </Button>
              {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
              {clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  isAdmin={role === "admin"}
                  activeVersionId={activeVersionId}
                  onSelectVersion={(v) => handleSelectVersion(client, v)}
                  onRename={() => { setRenameId(client.id); setNewName(client.name); }}
                  onDuplicate={() => duplicateClient.mutate({ id: client.id, name: `${client.name} Copy` })}
                  onDelete={() => deleteClient.mutate(client.id)}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button size="sm" variant="outline" onClick={handleSave} disabled={!activeVersionId} className="h-7 px-2">
          <Save className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setSaveAsOpen(true); setNewName(""); setNewNotes(""); }} disabled={!activeClientId} className="h-7 px-2 text-xs">
          Save As
        </Button>
      </div>

      {/* Save As dialog */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">Save As New Version</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Version Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`v${versions.length + 1}`} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes" className="h-8 text-sm" />
            </div>
            <Button size="sm" onClick={handleSaveAs} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Client dialog */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">New Client</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Client Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Apollo Hospitals" className="h-8 text-sm" />
            </div>
            <Button size="sm" onClick={handleNewClient} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameId} onOpenChange={(open) => { if (!open) setRenameId(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">Rename Client</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
            <Button size="sm" onClick={() => { if (renameId) renameClient.mutate({ id: renameId, name: newName }); setRenameId(null); }} className="w-full">Rename</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientRow({ client, isAdmin, activeVersionId, onSelectVersion, onRename, onDuplicate, onDelete }: {
  client: Client;
  isAdmin: boolean;
  activeVersionId: string | null;
  onSelectVersion: (v: Version) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: versions = [] } = useVersions(expanded ? client.id : null);

  return (
    <div className="rounded border">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50">
        <span className="text-sm font-medium truncate">{client.name}</span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-0.5 hover:text-primary"><Pencil className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-primary"><Copy className="h-3 w-3" /></button>
          {isAdmin && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 py-1.5 space-y-0.5">
          {versions.map((v: Version) => (
            <button
              key={v.id}
              onClick={() => onSelectVersion(v)}
              className={`block w-full text-left px-2 py-1 rounded text-xs hover:bg-primary/10 ${v.id === activeVersionId ? "bg-primary/10 font-semibold" : ""}`}
            >
              {v.name}
              {v.notes && <span className="ml-1 text-muted-foreground">— {v.notes}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
