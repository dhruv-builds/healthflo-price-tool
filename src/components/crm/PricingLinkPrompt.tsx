import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, X } from "lucide-react";
import { useCrmAccounts, useUpdateAccount } from "@/hooks/useCrmAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { AccountForm } from "./AccountForm";
import { toast } from "sonner";
import type { CrmAccount } from "@/types/crm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

type Mode = "choose" | "link";

export function PricingLinkPrompt({ open, onOpenChange, clientId, clientName }: Props) {
  const { user } = useAuth();
  const { data: accounts = [] } = useCrmAccounts();
  const updateAccount = useUpdateAccount();

  const [mode, setMode] = useState<Mode>("choose");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const linkable = accounts.filter((a) => !a.linked_client_id || a.linked_client_id === clientId);
  const filtered = search
    ? linkable.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : linkable;

  const close = () => {
    setMode("choose");
    setSearch("");
    onOpenChange(false);
  };

  const linkAccount = async (accountId: string) => {
    await updateAccount.mutateAsync({
      id: accountId,
      linked_client_id: clientId,
      updated_by: user?.id ?? null,
    });
    toast.success("Pricing client linked to account");
    close();
  };

  const onAccountCreated = async (acc: CrmAccount) => {
    await linkAccount(acc.id);
  };

  return (
    <>
      <Dialog open={open && !createOpen} onOpenChange={(v) => (v ? null : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Link this pricing to a CRM account?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            You just saved <span className="font-medium text-foreground">{clientName}</span>. Linking it to a CRM account lets the team track this deal end-to-end.
          </p>

          {mode === "choose" && (
            <div className="space-y-2 pt-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => setMode("link")}>
                <Building2 className="h-4 w-4 mr-2" />
                Link to Existing Account
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Account ({clientName})
              </Button>
              <Button className="w-full justify-start" variant="ghost" onClick={close}>
                <X className="h-4 w-4 mr-2" />
                Skip for Now
              </Button>
            </div>
          )}

          {mode === "link" && (
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border">
                {filtered.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">No matching accounts.</p>
                ) : (
                  filtered.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => linkAccount(a.id)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.account_type}{a.geography ? ` · ${a.geography}` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMode("choose")}>Back</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AccountForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName={clientName}
        onCreated={onAccountCreated}
      />
    </>
  );
}
