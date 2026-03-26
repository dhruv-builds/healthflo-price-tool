import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateAccount } from "@/hooks/useCrmAccounts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Constants } from "@/integrations/supabase/types";
import type { CrmAccountStatus } from "@/types/crm";

const statusColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Dormant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Won Customer": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statuses = Constants.public.Enums.crm_account_status;

interface StatusBadgeDropdownProps {
  accountId: string;
  currentStatus: CrmAccountStatus;
}

export function StatusBadgeDropdown({ accountId, currentStatus }: StatusBadgeDropdownProps) {
  const { user } = useAuth();
  const updateAccount = useUpdateAccount();

  const handleChange = async (value: string) => {
    if (value === currentStatus) return;
    try {
      await updateAccount.mutateAsync({
        id: accountId,
        status: value as CrmAccountStatus,
        updated_by: user?.id ?? null,
      });
      toast.success(`Status updated to ${value}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none ${statusColors[currentStatus] || "bg-secondary text-secondary-foreground"}`}
      >
        {currentStatus}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuRadioGroup value={currentStatus} onValueChange={handleChange}>
          {statuses.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {s}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
