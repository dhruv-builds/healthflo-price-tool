import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateDocument, uploadCrmFile } from "@/hooks/useCrmDocuments";
import { useToast } from "@/hooks/use-toast";

interface DocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
}

export function DocumentForm({ open, onOpenChange, accountId }: DocumentFormProps) {
  const { user } = useAuth();
  const createDoc = useCreateDocument();
  const { toast } = useToast();
  const [tab, setTab] = useState<"link" | "file">("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle("");
    setUrl("");
    setDescription("");
    setFile(null);
  };

  const handleSubmitLink = async () => {
    if (!user || !title || !url) return;
    await createDoc.mutateAsync({
      account_id: accountId,
      item_type: "link",
      title,
      url,
      file_path: null,
      description: description || null,
      created_by: user.id,
    });
    reset();
    onOpenChange(false);
  };

  const handleSubmitFile = async () => {
    if (!user || !title || !file) return;
    setUploading(true);
    try {
      const filePath = await uploadCrmFile(file, user.id);
      await createDoc.mutateAsync({
        account_id: accountId,
        item_type: "file",
        title,
        url: null,
        file_path: filePath,
        description: description || null,
        created_by: user.id,
      });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "link" | "file")}>
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1">Link</TabsTrigger>
            <TabsTrigger value="file" className="flex-1">File</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Proposal Deck" />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmitLink} disabled={!title || !url || createDoc.isPending}>Add Link</Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Compliance Doc" />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmitFile} disabled={!title || !file || uploading}>
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
