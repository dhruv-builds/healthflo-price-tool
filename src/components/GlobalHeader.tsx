import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export function GlobalHeader() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrm = location.pathname.startsWith("/crm");

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">HealthFlo</span>
          <span className="text-xs text-muted-foreground">Enterprise Suite</span>
        </div>

        <div className="flex rounded-md border">
          <button
            onClick={() => navigate("/")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${!isCrm ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate("/crm")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${isCrm ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            CRM
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {role === "admin" && (
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")} className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Manage Users
          </Button>
        )}
      </div>
    </div>
  );
}
