import { CrmActivity, CrmContact, CrmOpportunity } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const typeIcons: Record<string, string> = {
  Meeting: "🤝",
  Call: "📞",
  Demo: "🖥️",
  Email: "📧",
  Note: "📝",
};

interface ActivityTimelineProps {
  activities: CrmActivity[];
  contacts: CrmContact[];
  opportunities: CrmOpportunity[];
  isLoading: boolean;
}

export function ActivityTimeline({ activities, contacts, opportunities, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />)}</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No activity logged yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add the first note, call summary, or meeting update.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const contact = contacts.find((c) => c.id === a.contact_id);
        const opp = opportunities.find((o) => o.id === a.opportunity_id);
        return (
          <div key={a.id} className="rounded-md border bg-card p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{typeIcons[a.activity_type] || "📋"}</span>
                <Badge variant="outline" className="text-xs">{a.activity_type}</Badge>
                {a.title && <span className="text-sm font-medium">{a.title}</span>}
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(a.activity_date), "MMM d, yyyy h:mm a")}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
            {(contact || opp) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {contact && <span>Contact: {contact.name}</span>}
                {opp && <span>Opp: {opp.name}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
