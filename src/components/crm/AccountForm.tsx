import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRM_ACCOUNT_TYPES, CRM_SOURCES, CRM_ACCOUNT_STATUSES, CrmAccount } from "@/types/crm";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateAccount, useUpdateAccount } from "@/hooks/useCrmAccounts";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(["Hospital", "Clinic", "Doctor"]),
  source: z.enum(["Founder Network", "Outbound", "Referral", "Inbound", "Partner", "Event", "Existing Relationship"]),
  referrer_name: z.string().optional().nullable(),
  geography: z.string().min(1, "Geography is required"),
  status: z.enum(["Active", "Dormant", "Won Customer", "Lost", "Archived"]),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: CrmAccount | null;
  defaultName?: string;
  onCreated?: (account: CrmAccount) => void;
}

export function AccountForm({ open, onOpenChange, account, defaultName, onCreated }: AccountFormProps) {
  const { user } = useAuth();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isEdit = !!account;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? defaultName ?? "",
      account_type: account?.account_type ?? "Hospital",
      source: account?.source ?? "Founder Network",
      referrer_name: account?.referrer_name ?? "",
      geography: account?.geography ?? "",
      status: account?.status ?? "Active",
      website: account?.website ?? "",
      notes: account?.notes ?? "",
    },
  });

  const source = form.watch("source");

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const payload = {
      ...values,
      referrer_name: values.source === "Referral" ? (values.referrer_name || null) : null,
      website: values.website || null,
      notes: values.notes || null,
      geography: values.geography || null,
    };

    if (isEdit && account) {
      await updateAccount.mutateAsync({ id: account.id, ...payload, updated_by: user.id });
    } else {
      const created = await createAccount.mutateAsync({ ...payload, owner_id: user.id, created_by: user.id, updated_by: user.id } as any);
      if (onCreated && created) onCreated(created);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Account" : "Create Account"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Apollo Hospitals" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="account_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CRM_ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CRM_ACCOUNT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Source *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {CRM_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {source === "Referral" && (
              <FormField control={form.control} name="referrer_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Referrer Name</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="Who referred this account?" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="geography" render={({ field }) => (
              <FormItem>
                <FormLabel>Geography *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Mumbai, Maharashtra" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                {isEdit ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
