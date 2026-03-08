import { CrmContact } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Mail, Phone, Linkedin } from "lucide-react";
import { useDeleteContact } from "@/hooks/useCrmContacts";
import { useAuth } from "@/contexts/AuthContext";

interface ContactsListProps {
  contacts: CrmContact[];
  accountId: string;
  isLoading: boolean;
  onEdit: (contact: CrmContact) => void;
}

export function ContactsList({ contacts, accountId, isLoading, onEdit }: ContactsListProps) {
  const { user, role } = useAuth();
  const deleteContact = useDeleteContact();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No contacts yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add the first stakeholder for this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((c) => (
        <div key={c.id} className="flex items-start justify-between rounded-md border bg-card p-4">
          <div className="space-y-1">
            <p className="font-medium text-sm">{c.name}</p>
            {c.title && <p className="text-xs text-muted-foreground">{c.title}{c.seniority ? ` · ${c.seniority}` : ""}</p>}
            {c.location && <p className="text-xs text-muted-foreground">{c.location}</p>}
            <div className="flex items-center gap-3 pt-1">
              {c.email && (
                <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Mail className="h-3 w-3" />{c.email}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Phone className="h-3 w-3" />{c.phone}
                </a>
              )}
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Linkedin className="h-3 w-3" />LinkedIn
                </a>
              )}
            </div>
            {c.notes && <p className="text-xs text-muted-foreground pt-1">{c.notes}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {(c.created_by === user?.id || role === "admin") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => deleteContact.mutate({ id: c.id, account_id: accountId })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
