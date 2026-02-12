import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface PendingApprovalProps {
  onSignOut: () => Promise<void>;
}

export default function PendingApproval({ onSignOut }: PendingApprovalProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Account Pending Approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been created but needs to be approved by an administrator before you can access the tool.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
