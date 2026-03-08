export default function CrmHome() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage hospitals, clinics, and doctors</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No accounts yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create your first hospital, clinic, or doctor account to start tracking outreach and deal progress.</p>
      </div>
    </div>
  );
}
