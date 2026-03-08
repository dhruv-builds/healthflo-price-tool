import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRM_ACTIVITY_TYPES, CrmContact, CrmOpportunity } from "@/types/crm";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateActivity } from "@/hooks/useCrmActivities";

const schema = z.object({
  activity_type: z.enum(["Meeting", "Call", "Demo", "Email", "Note"]),
  title: z.string().optional(),
  activity_date: z.string().min(1, "Date is required"),
  contact_id: z.string().optional().nullable(),
  opportunity_id: z.string().optional().nullable(),
  notes: z.string().min(1, "Notes are required"),
});

type FormValues = z.infer<typeof schema>;

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  contacts: CrmContact[];
  opportunities: CrmOpportunity[];
}

export function ActivityForm({ open, onOpenChange, accountId, contacts, opportunities }: ActivityFormProps) {
  const { user } = useAuth();
  const createActivity = useCreateActivity();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_type: "Meeting",
      title: "",
      activity_date: new Date().toISOString().slice(0, 16),
      contact_id: null,
      opportunity_id: null,
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    await createActivity.mutateAsync({
      account_id: accountId,
      activity_type: values.activity_type,
      title: values.title || null,
      activity_date: new Date(values.activity_date).toISOString(),
      contact_id: values.contact_id || null,
      opportunity_id: values.opportunity_id || null,
      notes: values.notes,
      created_by: user.id,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="activity_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CRM_ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="activity_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date/Time *</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Intro call with CEO" /></FormControl>
              </FormItem>
            )} />

            {contacts.length > 0 && (
              <FormField control={form.control} name="contact_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Contact</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            {opportunities.length > 0 && (
              <FormField control={form.control} name="opportunity_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Opportunity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes *</FormLabel>
                <FormControl><Textarea {...field} rows={4} placeholder="What happened? Who was involved? What's the next step?" /></FormControl>
                <FormDescription className="text-xs">Cover: stakeholders involved, deal stage impact, next step</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createActivity.isPending}>Log Activity</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
