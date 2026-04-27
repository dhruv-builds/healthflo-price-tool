import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DocumentRow,
  useCommercialAccountProfile,
  useCommercialDocuments,
  useDocumentMutations,
} from "@/hooks/useCommercialDocs";
import { STATUS_LABELS, STATUS_TONES, TYPE_LABELS } from "@/types/commercialDoc";
import { CreateCommercialDocDialog } from "./CreateCommercialDocDialog";
import { AccountProfileForm } from "./AccountProfileForm";
import { format } from "date-fns";
import { Copy, FileText, Plus, Settings, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  accountId: string;
  accountName: string;
  defaultLinkedClientId?: string | null;
}

export function CommercialDocsPanel({ accountId, accountName, defaultLinkedClientId }: Props) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { data: docs = [], isLoading } = useCommercialDocuments(accountId);
  const { data: profile } = useCommercialAccountProfile(accountId);
  const { duplicateDocument, deleteDocument } = useDocumentMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="space-y-4">
      {/* Defaults card */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Account defaults for documents</div>
            <p className="text-xs text-muted-foreground">
              {profile
                ? `Client legal name: ${profile.client_legal_name ?? "—"} · Signatory: ${profile.signatory_name ?? "—"}`
                : "Not set — drafts will use placeholders. Set defaults to autofill new documents."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowProfile(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" />
            {profile ? "Edit defaults" : "Set defaults"}
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Documents ({docs.length})</div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No commercial documents yet</p>
          <p className="text-xs text-muted-foreground">Create an MoU or Pricing Addendum to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              onOpen={() => navigate(`/crm/accounts/${accountId}/docs/${d.id}`)}
              onDuplicate={() => duplicateDocument.mutate(d.id)}
              onDelete={
                d.created_by === user?.id || role === "admin"
                  ? () => {
                      if (confirm(`Delete "${d.title}"? This cannot be undone.`)) {
                        deleteDocument.mutate({ id: d.id, account_id: accountId });
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CreateCommercialDocDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        accountId={accountId}
        accountName={accountName}
        defaultLinkedClientId={defaultLinkedClientId}
      />
      <AccountProfileForm
        open={showProfile}
        onOpenChange={setShowProfile}
        accountId={accountId}
        accountName={accountName}
        initial={profile ?? null}
      />
    </div>
  );
}

function DocRow({
  doc,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  doc: DocumentRow;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const unresolved = Array.isArray(doc.unresolved_fields) ? doc.unresolved_fields.length : 0;
  return (
    <Card className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer" onClick={onOpen}>
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate">{doc.title}</div>
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[doc.doc_type]}</Badge>
            <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_TONES[doc.status]}`}>
              {STATUS_LABELS[doc.status]}
            </span>
            {unresolved > 0 && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                {unresolved} to fill
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {format(new Date(doc.updated_at), "MMM d, yyyy")}
            {doc.linked_version_id && " · linked to pricing version"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {onDelete && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
