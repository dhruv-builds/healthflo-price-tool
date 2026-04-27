import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import PendingApproval from "./components/PendingApproval";
import { GlobalHeader } from "./components/GlobalHeader";
import { CrmLayout } from "./components/crm/CrmLayout";
import CrmHome from "./pages/crm/CrmHome";
import AccountDetail from "./pages/crm/AccountDetail";
import TasksPage from "./pages/crm/TasksPage";
import ReportsPage from "./pages/crm/ReportsPage";
import WorkflowPage from "./pages/crm/WorkflowPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, approved, loading, signOut } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!approved) return <PendingApproval onSignOut={signOut} />;
  return <>{children}</>;
}

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <GlobalHeader />
      <Outlet />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/crm" element={<CrmLayout />}>
                <Route index element={<CrmHome />} />
                <Route path="accounts/:id" element={<AccountDetail />} />
                <Route path="workflows" element={<WorkflowPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
