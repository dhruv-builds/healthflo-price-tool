// LogoLibraryDialog — browse + upload + pick brand logos.
// Used as a picker (onPick) and as a manager (admin-only delete).
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload, ImagePlus, Search } from "lucide-react";
import {
  useCommercialLogos,
  useDeleteLogo,
  useResolvedLogoUrls,
  useUploadLogo,
} from "@/hooks/useCommercialLogos";
import type { LogoLibraryItem, LogoLibraryKind, LogoLibraryScope } from "@/types/commercialDoc";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string | null;
  onPick?: (logo: LogoLibraryItem) => void;
  /** When false, hides the "pick" interaction (pure management view). */
  pickMode?: boolean;
  /** When true, allows deleting global logos too. */
  isAdmin?: boolean;
}

export function LogoLibraryDialog({ open, onOpenChange, accountId, onPick, pickMode = true, isAdmin = false }: Props) {
  const { data: logos = [], isLoading } = useCommercialLogos(accountId);
  const del = useDeleteLogo();
  const [scope, setScope] = useState<"all" | LogoLibraryScope>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      logos.filter((l) => {
        if (scope !== "all" && l.scope !== scope) return false;
        if (search && !l.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [logos, scope, search],
  );

  const urls = useResolvedLogoUrls(filtered.map((l) => l.file_path));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Logo library</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="upload">Upload new</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3 pt-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logos…"
                  className="h-8 pl-7"
                />
              </div>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scopes</SelectItem>
                  <SelectItem value="global">Global only</SelectItem>
                  <SelectItem value="account">This account only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground">No logos yet. Upload one in the next tab.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filtered.map((logo) => {
                  const url = urls.data?.[logo.file_path];
                  return (
                    <div key={logo.id} className="rounded-md border p-2 space-y-2 bg-muted/30">
                      <div className="aspect-[3/2] flex items-center justify-center bg-background rounded">
                        {url ? (
                          <img src={url} alt={logo.label} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-1 min-w-0">
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate" title={logo.label}>{logo.label}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {logo.scope} · {logo.kind}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {pickMode && onPick && (
                            <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={() => { onPick(logo); onOpenChange(false); }}>
                              Use
                            </Button>
                          )}
                          {(logo.scope === "account" || isAdmin) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => del.mutate(logo)}
                              title="Delete logo"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="pt-3">
            <UploadForm accountId={accountId} onUploaded={() => { /* react-query invalidates list */ }} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadForm({ accountId, onUploaded }: { accountId: string | null; onUploaded: () => void }) {
  const upload = useUploadLogo();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<LogoLibraryScope>(accountId ? "account" : "global");
  const [kind, setKind] = useState<LogoLibraryKind>("client");

  const submit = async () => {
    if (!file) return;
    if (scope === "account" && !accountId) return;
    await upload.mutateAsync({ file, label: label || file.name, scope, accountId, kind });
    setFile(null);
    setLabel("");
    onUploaded();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Image (PNG / JPG)</Label>
        <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Jeena Sikho — primary" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Scope</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as LogoLibraryScope)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (all accounts)</SelectItem>
              <SelectItem value="account" disabled={!accountId}>This account only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as LogoLibraryKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vendor">Vendor (HealthFlo)</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={submit} disabled={!file || upload.isPending} className="gap-1">
        <Upload className="h-3.5 w-3.5" />
        {upload.isPending ? "Uploading…" : "Upload to library"}
      </Button>
    </div>
  );
}
