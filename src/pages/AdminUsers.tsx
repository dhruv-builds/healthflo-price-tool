import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserRow {
  user_id: string;
  email: string | null;
  role: "admin" | "employee";
  created_at: string;
}

export default function AdminUsers() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchUsers = async () => {
    setFetching(true);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, created_at");
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (pErr || rErr) {
      toast({ title: "Error loading users", description: (pErr || rErr)?.message, variant: "destructive" });
      setFetching(false);
      return;
    }

    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    setUsers(
      (profiles ?? []).map((p) => ({
        user_id: p.id,
        email: p.email,
        role: (roleMap.get(p.id) as "admin" | "employee") ?? "employee",
        created_at: p.created_at,
      }))
    );
    setFetching(false);
  };

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role]);

  const updateRole = async (userId: string, newRole: "admin" | "employee") => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    }
  };

  if (loading) return null;
  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">User Management</h1>
        </div>

        {fetching ? (
          <p className="text-muted-foreground text-sm">Loading users…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => updateRole(u.user_id, v as "admin" | "employee")}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
