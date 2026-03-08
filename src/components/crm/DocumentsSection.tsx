import { CrmDocument } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeleteDocument, getCrmFileSignedUrl } from "@/hooks/useCrmDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink, FileText, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

interface DocumentsSectionProps {
  documents: CrmDocument[];
  accountId: string;
  isLoading: boolean;
  onAdd: () => void;
}

export function DocumentsSection({ documents, accountId, isLoading, onAdd }: DocumentsSectionProps) {
  const { user, role } = useAuth();
  const deleteDoc = useDeleteDocument();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-3.5 w-3.5 mr-1" />Add File or Link</Button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No files or links yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a proposal deck, shared folder, pricing sheet, website, or call summary.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border bg-card p-3">
              <div className="flex items-center gap-3">
                {doc.item_type === "link" ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <div className="flex items-center gap-2">
                    {doc.item_type === "link" && doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">{doc.title}</a>
                    ) : (
                      <button
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={async () => {
                          if (doc.file_path) {
                            const url = await getCrmFileSignedUrl(doc.file_path);
                            window.open(url, "_blank");
                          }
                        }}
                      >
                        {doc.title}
                      </button>
                    )}
                    <Badge variant="outline" className="text-xs">{doc.item_type}</Badge>
                  </div>
                  {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              {(doc.created_by === user?.id || role === "admin") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => deleteDoc.mutate({ id: doc.id, account_id: accountId, file_path: doc.file_path })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
