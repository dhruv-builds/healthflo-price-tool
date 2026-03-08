import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Building2, ListTodo, BarChart3 } from "lucide-react";

const navItems = [
  { to: "/crm", label: "Accounts", icon: Building2, end: true },
  { to: "/crm/tasks", label: "Tasks", icon: ListTodo },
  { to: "/crm/reports", label: "Reports", icon: BarChart3 },
];

export function CrmLayout() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <nav className="flex items-center gap-1 border-b bg-card px-6 py-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
