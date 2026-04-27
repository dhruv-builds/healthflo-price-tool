import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AccountProfile,
} from "@/types/commercialDoc";
import {
  uploadCommercialAsset,
  useUpsertAccountProfile,
} from "@/hooks/useCommercialDocs";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  initial: AccountProfile | null;
  accountName: string;
}

const empty = (accountId: string, name: string): AccountProfile => ({
  account_id: accountId,
  client_legal_name: name,
  display_name: name,
  vendor_legal_name: "HealthFlo Technologies",
});

export function AccountProfileForm({ open, onOpenChange, accountId, initial, accountName }: Props) {
  const [form, setForm] = useState<AccountProfile>(initial ?? empty(accountId, accountName));
  const [uploading, setUploading] = useState<string | null>(null);
  const upsert = useUpsertAccountProfile();

  useEffect(() => {
    setForm(initial ?? empty(accountId, accountName));
  }, [initial, accountId, accountName, open]);

  const set = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (
    field: "primary_logo_path" | "secondary_logo_path" | "vendor_logo_path",
    file: File
  ) => {
    setUploading(field);
    try {
      const path = await uploadCommercialAsset(accountId, file, "logo");
      set(field, path);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    await upsert.mutateAsync(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commercial document defaults</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="client">
          <TabsList>
            <TabsTrigger value="client">Client identity</TabsTrigger>
            <TabsTrigger value="vendor">Vendor (HealthFlo)</TabsTrigger>
            <TabsTrigger value="signatory">Signatory</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="space-y-3 pt-3">
            <Field label="Legal name" value={form.client_legal_name} onChange={(v) => set("client_legal_name", v)} />
            <Field label="Display name" value={form.display_name} onChange={(v) => set("display_name", v)} />
            <Field label="Address" value={form.address} onChange={(v) => set("address", v)} multiline />
            <div className="grid grid-cols-3 gap-2">
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
              <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
            </div>
            <LogoUpload
              label="Client primary logo"
              value={form.primary_logo_path}
              uploading={uploading === "primary_logo_path"}
              onUpload={(f) => handleUpload("primary_logo_path", f)}
            />
            <LogoUpload
              label="Client secondary logo (optional)"
              value={form.secondary_logo_path}
              uploading={uploading === "secondary_logo_path"}
              onUpload={(f) => handleUpload("secondary_logo_path", f)}
            />
          </TabsContent>

          <TabsContent value="vendor" className="space-y-3 pt-3">
            <Field label="Vendor legal name" value={form.vendor_legal_name} onChange={(v) => set("vendor_legal_name", v)} />
            <Field label="Vendor signatory name" value={form.vendor_signatory_name} onChange={(v) => set("vendor_signatory_name", v)} />
            <Field label="Vendor signatory title" value={form.vendor_signatory_title} onChange={(v) => set("vendor_signatory_title", v)} />
            <LogoUpload
              label="Vendor logo"
              value={form.vendor_logo_path}
              uploading={uploading === "vendor_logo_path"}
              onUpload={(f) => handleUpload("vendor_logo_path", f)}
            />
          </TabsContent>

          <TabsContent value="signatory" className="space-y-3 pt-3">
            <Field label="Signatory name" value={form.signatory_name} onChange={(v) => set("signatory_name", v)} />
            <Field label="Signatory title" value={form.signatory_title} onChange={(v) => set("signatory_title", v)} />
            <Field label="Signatory email" value={form.signatory_email} onChange={(v) => set("signatory_email", v)} />
          </TabsContent>

          <TabsContent value="other" className="space-y-3 pt-3">
            <Field label="Preferred document subtitle" value={form.preferred_subtitle} onChange={(v) => set("preferred_subtitle", v)} />
            <Field label="Legal / billing notes" value={form.legal_notes} onChange={(v) => set("legal_notes", v)} multiline />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={upsert.isPending}>Save defaults</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function LogoUpload({
  label,
  value,
  uploading,
  onUpload,
}: {
  label: string;
  value: string | null | undefined;
  uploading: boolean;
  onUpload: (f: File) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          className="hidden"
          id={`upload-${label}`}
        />
        <Button asChild size="sm" variant="outline" disabled={uploading}>
          <label htmlFor={`upload-${label}`} className="cursor-pointer">
            <Upload className="h-3.5 w-3.5 mr-1" />
            {uploading ? "Uploading..." : "Choose file"}
          </label>
        </Button>
        {value && <span className="text-xs text-muted-foreground truncate max-w-xs">{value.split("/").pop()}</span>}
      </div>
    </div>
  );
}
