import { useNavigate } from "react-router-dom";
import { CrmAccount } from "@/types/crm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { StatusBadgeDropdown } from "./StatusBadgeDropdown";

interface AccountsTableProps {
  accounts: CrmAccount[];
  isLoading: boolean;
}

const typeColors: Record<string, string> = {
  Hospital: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Clinic: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Doctor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Dormant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Won Customer": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No accounts yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first hospital, clinic, or doctor account to start tracking outreach and deal progress.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Geography</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow
              key={a.id}
              className="cursor-pointer"
              onClick={() => navigate(`/crm/accounts/${a.id}`)}
            >
              <TableCell className="font-medium">
                {a.name}
                {a.linked_client_id && (
                  <ExternalLink className="ml-1.5 inline h-3 w-3 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={typeColors[a.account_type] || ""}>
                  {a.account_type}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.source}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.geography || "—"}</TableCell>
              <TableCell>
                <StatusBadgeDropdown accountId={a.id} currentStatus={a.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {a.last_activity_at ? format(new Date(a.last_activity_at), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/accounts/${a.id}`);
                  }}
                >
                  →
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
