import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Client {
  id: string;
  name: string;
}

interface PricingLinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  currentLinkedId: string | null;
  onLink: (clientId: string) => Promise<void>;
}

export function PricingLinkSelector({ open, onOpenChange, clients, currentLinkedId, onLink }: PricingLinkSelectorProps) {
  const [selected, setSelected] = useState(currentLinkedId ?? "");
  const [saving, setSaving] = useState(false);

  if (clients.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link Pricing Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">No pricing clients exist yet. Create one in the Pricing module first.</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Link Pricing Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select a pricing client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!selected || saving}
              onClick={async () => {
                setSaving(true);
                await onLink(selected);
                setSaving(false);
              }}
            >
              Link Client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
