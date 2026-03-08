import { useCrmAccounts } from "@/hooks/useCrmAccounts";
import { useAllOpportunities } from "@/hooks/useCrmOpportunities";
import { useCrmTasks } from "@/hooks/useCrmTasks";
import { useRecentActivities } from "@/hooks/useCrmActivities";
import { Badge } from "@/components/ui/badge";
import { Building2, Stethoscope, TrendingUp, ListTodo, Activity, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function ReportsPage() {
  const { data: accounts = [] } = useCrmAccounts();
  const { data: opportunities = [] } = useAllOpportunities();
  const { data: dueTasks = [] } = useCrmTasks({ dueThisWeek: true });
  const { data: overdueTasks = [] } = useCrmTasks({ overdue: true });
  const { data: recentActivities = [] } = useRecentActivities(10);

  const hospitals = accounts.filter((a) => a.account_type === "Hospital").length;
  const clinics = accounts.filter((a) => a.account_type === "Clinic").length;
  const doctors = accounts.filter((a) => a.account_type === "Doctor").length;

  const openOpps = opportunities.filter((o) => !["Won", "Lost"].includes(o.stage));
  const staleAccounts = accounts.filter((a) => {
    if (a.status === "Archived" || a.status === "Lost") return false;
    if (!a.last_activity_at) return true;
    const daysSince = (Date.now() - new Date(a.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  });

  const oppsByStage = openOpps.reduce<Record<string, number>>((acc, o) => {
    acc[o.stage] = (acc[o.stage] || 0) + 1;
    return acc;
  }, {});

  if (accounts.length === 0 && opportunities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No CRM activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Reports will populate as you add accounts, activities, and tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<Building2 className="h-4 w-4" />} label="Hospitals" value={hospitals} />
        <KpiCard icon={<Building2 className="h-4 w-4" />} label="Clinics" value={clinics} />
        <KpiCard icon={<Stethoscope className="h-4 w-4" />} label="Doctors" value={doctors} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Open Opps" value={openOpps.length} />
        <KpiCard icon={<ListTodo className="h-4 w-4" />} label="Due This Week" value={dueTasks.length} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Overdue Tasks" value={overdueTasks.length} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Opportunities by Stage */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Open Opportunities by Stage</h3>
          {Object.keys(oppsByStage).length === 0 ? (
            <p className="text-xs text-muted-foreground">No open opportunities</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(oppsByStage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <Badge variant="outline">{stage}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stale Accounts */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Stale Accounts (no activity 14+ days)</h3>
          {staleAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stale accounts</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {staleAccounts.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.last_activity_at ? format(new Date(a.last_activity_at), "MMM d") : "Never"}
                  </span>
                </div>
              ))}
              {staleAccounts.length > 10 && <p className="text-xs text-muted-foreground">+{staleAccounts.length - 10} more</p>}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
        {recentActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.activity_type}</Badge>
                  <span className="text-muted-foreground truncate max-w-xs">{a.title || a.notes.slice(0, 60)}</span>
                </div>
                <span className="text-muted-foreground">{format(new Date(a.activity_date), "MMM d, h:mm a")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${accent && value > 0 ? "border-destructive/30" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-semibold ${accent && value > 0 ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
