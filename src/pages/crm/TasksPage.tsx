export default function TasksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add a follow-up so the next step is clear.</p>
      </div>
    </div>
  );
}
