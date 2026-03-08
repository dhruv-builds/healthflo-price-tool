import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CrmContact } from "@/types/crm";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateContact, useUpdateContact } from "@/hooks/useCrmContacts";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional().nullable(),
  seniority: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  linkedin_url: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  contact?: CrmContact | null;
}

export function ContactForm({ open, onOpenChange, accountId, contact }: ContactFormProps) {
  const { user } = useAuth();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isEdit = !!contact;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: contact?.name ?? "",
      title: contact?.title ?? "",
      seniority: contact?.seniority ?? "",
      location: contact?.location ?? "",
      linkedin_url: contact?.linkedin_url ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      notes: contact?.notes ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const payload = {
      ...values,
      title: values.title || null,
      seniority: values.seniority || null,
      location: values.location || null,
      linkedin_url: values.linkedin_url || null,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    };

    if (isEdit && contact) {
      await updateContact.mutateAsync({ id: contact.id, account_id: accountId, ...payload });
    } else {
      await createContact.mutateAsync({ ...payload, name: values.name, account_id: accountId, created_by: user.id });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl><Input {...field} placeholder="Full name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. CEO" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="seniority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Seniority</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. C-Level" /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} placeholder="City, State" /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="linkedin_url" render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn URL</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://linkedin.com/in/..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                {isEdit ? "Save Contact" : "Add Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
