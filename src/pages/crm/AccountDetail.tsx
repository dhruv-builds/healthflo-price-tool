import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCrmAccount, useUpdateAccount } from "@/hooks/useCrmAccounts";
import { useCrmContacts } from "@/hooks/useCrmContacts";
import { useCrmOpportunities } from "@/hooks/useCrmOpportunities";
import { useCrmActivities } from "@/hooks/useCrmActivities";
import { useCrmTasks } from "@/hooks/useCrmTasks";
import { useCrmDocuments } from "@/hooks/useCrmDocuments";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, UserPlus, MessageSquarePlus, ListPlus, TrendingUp, FileText, ExternalLink, Link } from "lucide-react";
import { StatusBadgeDropdown } from "@/components/crm/StatusBadgeDropdown";
import { AccountForm } from "@/components/crm/AccountForm";
import { ContactsList } from "@/components/crm/ContactsList";
import { ContactForm } from "@/components/crm/ContactForm";
import { OpportunitySection } from "@/components/crm/OpportunitySection";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { ActivityForm } from "@/components/crm/ActivityForm";
import { TasksList } from "@/components/crm/TasksList";
import { TaskForm } from "@/components/crm/TaskForm";
import { DocumentsSection } from "@/components/crm/DocumentsSection";
import { DocumentForm } from "@/components/crm/DocumentForm";
import { PricingLinkSelector } from "@/components/crm/PricingLinkSelector";
import { WorkflowPanel } from "@/components/crm/WorkflowPanel";
import { useWorkflowByAccount } from "@/hooks/useWorkflowRecords";
import { CrmContact } from "@/types/crm";

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: account, isLoading } = useCrmAccount(id ?? null);
  const { data: contacts = [], isLoading: contactsLoading } = useCrmContacts(id ?? null);
  const { data: opportunities = [], isLoading: oppsLoading } = useCrmOpportunities(id ?? null);
  const { data: activities = [], isLoading: activitiesLoading } = useCrmActivities(id ?? null);
  const { data: tasks = [], isLoading: tasksLoading } = useCrmTasks({ account_id: id ?? undefined });
  const { data: documents = [], isLoading: docsLoading } = useCrmDocuments(id ?? null);
  const { data: clients = [] } = useClients();
  const updateAccount = useUpdateAccount();

  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showPricingLink, setShowPricingLink] = useState(false);

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Account not found</p>
        <Button variant="link" onClick={() => navigate("/crm")}>Back to Accounts</Button>
      </div>
    );
  }

  const linkedClient = clients.find((c) => c.id === account.linked_client_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" className="mt-1 h-7 w-7 p-0" onClick={() => navigate("/crm")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{account.name}</h1>
              <Badge variant="secondary">{account.account_type}</Badge>
              <StatusBadgeDropdown accountId={account.id} currentStatus={account.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.source}{account.geography ? ` · ${account.geography}` : ""}
              {linkedClient && (
                <span className="ml-2">
                  · <Link className="inline h-3 w-3" /> Linked to <button className="underline" onClick={() => navigate(`/?clientId=${account.linked_client_id}`)}>{linkedClient.name}</button>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowEditAccount(true)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditingContact(null); setShowContactForm(true); }}><UserPlus className="h-3.5 w-3.5 mr-1" />Add Contact</Button>
          <Button size="sm" variant="outline" onClick={() => setShowActivityForm(true)}><MessageSquarePlus className="h-3.5 w-3.5 mr-1" />Log Activity</Button>
          <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}><ListPlus className="h-3.5 w-3.5 mr-1" />Create Task</Button>
          {!account.linked_client_id && (
            <Button size="sm" variant="outline" onClick={() => setShowPricingLink(true)}><ExternalLink className="h-3.5 w-3.5 mr-1" />Link Pricing</Button>
          )}
          {account.linked_client_id && (
            <Button size="sm" onClick={() => navigate(`/?clientId=${account.linked_client_id}`)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Pricing
            </Button>
          )}
        </div>
      </div>

      {/* Notes */}
      {account.notes && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">{account.notes}</div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline ({activities.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunity ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline activities={activities} contacts={contacts} opportunities={opportunities} isLoading={activitiesLoading} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsList contacts={contacts} accountId={account.id} isLoading={contactsLoading} onEdit={(c) => { setEditingContact(c); setShowContactForm(true); }} />
        </TabsContent>

        <TabsContent value="opportunity" className="mt-4">
          <OpportunitySection accountId={account.id} accountName={account.name} opportunities={opportunities} isLoading={oppsLoading} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksList tasks={tasks} isLoading={tasksLoading} onEdit={() => setShowTaskForm(true)} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsSection documents={documents} accountId={account.id} isLoading={docsLoading} onAdd={() => setShowDocForm(true)} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AccountForm open={showEditAccount} onOpenChange={setShowEditAccount} account={account} />
      <ContactForm open={showContactForm} onOpenChange={setShowContactForm} accountId={account.id} contact={editingContact} />
      <ActivityForm open={showActivityForm} onOpenChange={setShowActivityForm} accountId={account.id} contacts={contacts} opportunities={opportunities} />
      <TaskForm open={showTaskForm} onOpenChange={setShowTaskForm} accountId={account.id} contacts={contacts} opportunities={opportunities} />
      <DocumentForm open={showDocForm} onOpenChange={setShowDocForm} accountId={account.id} />
      <PricingLinkSelector
        open={showPricingLink}
        onOpenChange={setShowPricingLink}
        clients={clients}
        currentLinkedId={account.linked_client_id}
        onLink={async (clientId) => {
          await updateAccount.mutateAsync({ id: account.id, linked_client_id: clientId, updated_by: user?.id ?? null });
          setShowPricingLink(false);
        }}
      />
    </div>
  );
}
