import { useState } from "react";
import { useCrmTasks } from "@/hooks/useCrmTasks";
import { useAuth } from "@/contexts/AuthContext";
import { TasksList } from "@/components/crm/TasksList";
import { TaskForm } from "@/components/crm/TaskForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("my");

  const { data: myTasks = [], isLoading: myLoading } = useCrmTasks({ assignee_id: user?.id });
  const { data: allTasks = [], isLoading: allLoading } = useCrmTasks();
  const { data: overdueTasks = [], isLoading: overdueLoading } = useCrmTasks({ overdue: true });
  const { data: weekTasks = [], isLoading: weekLoading } = useCrmTasks({ dueThisWeek: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Create Task
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueTasks.length})</TabsTrigger>
          <TabsTrigger value="week">Due This Week ({weekTasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="my" className="mt-4"><TasksList tasks={myTasks} isLoading={myLoading} /></TabsContent>
        <TabsContent value="all" className="mt-4"><TasksList tasks={allTasks} isLoading={allLoading} /></TabsContent>
        <TabsContent value="overdue" className="mt-4"><TasksList tasks={overdueTasks} isLoading={overdueLoading} /></TabsContent>
        <TabsContent value="week" className="mt-4"><TasksList tasks={weekTasks} isLoading={weekLoading} /></TabsContent>
      </Tabs>

      <TaskForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
