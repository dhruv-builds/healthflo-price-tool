import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, X } from "lucide-react";
import { useCrmAccounts, useUpdateAccount } from "@/hooks/useCrmAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { AccountForm } from "./AccountForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

type Mode = "choose" | "link" | "create";

export function PricingLinkPrompt({ open, onOpenChange, clientId, clientName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: accounts = [] } = useCrmAccounts();
  const updateAccount = useUpdateAccount();

  const [mode, setMode] = useState<Mode>("choose");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Hide accounts already linked to a different pricing client
  const linkable = accounts.filter((a) => !a.linked_client_id || a.linked_client_id === clientId);
  const filtered = search
    ? linkable.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : linkable;

  const reset = () => {
    setMode("choose");
    setSearch("");
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleLink = async (accountId: string) => {
    await updateAccount.mutateAsync({
      id: accountId,
      linked_client_id: clientId,
      updated_by: user?.id ?? null,
    });
    toast.success("Pricing client linked to account");
    close();
  };

  // After AccountForm closes successfully, find the newly created account by name and link it.
  const handleAfterCreate = async () => {
    setCreateOpen(false);
    // Refetch then locate
    await qc.invalidateQueries({ queryKey: ["crm-accounts"] });
    const { data, error } = await supabase
      .from("crm_accounts")
      .select("*")
      .eq("name", clientName)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.[0]) {
      toast.error("Account created but could not auto-link. Link from the account page.");
      close();
      return;
    }
    await handleLink(data[0].id);
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
                      onClick={() => handleLink(a.id)}
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

      {/* Reuse existing AccountForm; we cannot prefill cleanly without refactoring it,
          so we instruct the user via the prompt above and detect by name afterwards. */}
      <AccountFormPrefilled
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) handleAfterCreate();
        }}
        defaultName={clientName}
      />
    </>
  );
}

// Light wrapper that re-uses AccountForm but seeds the name field via a key remount.
function AccountFormPrefilled({
  open,
  onOpenChange,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName: string;
}) {
  // We pass account={null} but use a synthetic prefill approach: render AccountForm with a
  // key bound to the name so its defaultValues pick up. AccountForm reads name from `account?.name`,
  // so we shape a partial account-like object containing only `name`.
  return (
    <AccountForm
      open={open}
      onOpenChange={onOpenChange}
      account={open ? ({ name: defaultName } as any) : null}
    />
  );
}
