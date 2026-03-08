import { useState } from "react";
import { useCrmAccounts } from "@/hooks/useCrmAccounts";
import { useAllOpportunities } from "@/hooks/useCrmOpportunities";
import { useCrmTasks } from "@/hooks/useCrmTasks";
import { useAuth } from "@/contexts/AuthContext";
import { AccountsTable } from "@/components/crm/AccountsTable";
import { AccountForm } from "@/components/crm/AccountForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building2, Stethoscope, Activity, ListTodo } from "lucide-react";
import { CRM_ACCOUNT_TYPES, CRM_ACCOUNT_STATUSES, CrmAccountType, CrmAccountStatus } from "@/types/crm";

export default function CrmHome() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  const filters = {
    search: search || undefined,
    account_type: typeFilter !== "all" ? (typeFilter as CrmAccountType) : undefined,
    status: statusFilter !== "all" ? (statusFilter as CrmAccountStatus) : undefined,
  };

  const { data: accounts = [], isLoading } = useCrmAccounts(filters);
  const { data: allAccounts = [] } = useCrmAccounts();
  const { data: opportunities = [] } = useAllOpportunities();
  const { data: dueTasks = [] } = useCrmTasks({ dueThisWeek: true });

  const hospitals = allAccounts.filter((a) => a.account_type === "Hospital").length;
  const clinics = allAccounts.filter((a) => a.account_type === "Clinic").length;
  const doctors = allAccounts.filter((a) => a.account_type === "Doctor").length;
  const openOpps = opportunities.filter((o) => !["Won", "Lost"].includes(o.stage)).length;
  const tasksDue = dueTasks.length;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard icon={<Building2 className="h-4 w-4" />} label="Hospitals" value={hospitals} />
        <MetricCard icon={<Plus className="h-4 w-4" />} label="Clinics" value={clinics} />
        <MetricCard icon={<Stethoscope className="h-4 w-4" />} label="Doctors" value={doctors} />
        <MetricCard icon={<Activity className="h-4 w-4" />} label="Open Opps" value={openOpps} />
        <MetricCard icon={<ListTodo className="h-4 w-4" />} label="Tasks Due" value={tasksDue} />
      </div>

      {/* Header + Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CRM_ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CRM_ACCOUNT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Account
        </Button>
      </div>

      <AccountsTable accounts={accounts} isLoading={isLoading} />
      <AccountForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
