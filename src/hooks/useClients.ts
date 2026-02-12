import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PricingInputs } from "@/types/pricing";
import { toast } from "sonner";

export interface Client {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Version {
  id: string;
  client_id: string;
  name: string;
  data: PricingInputs;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as unknown as Client[];
    },
  });
}

export function useVersions(clientId: string | null) {
  return useQuery({
    queryKey: ["versions", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("versions")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Version[];
    },
  });
}

export function useClientMutations() {
  const qc = useQueryClient();

  const createClient = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: PricingInputs }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: client, error } = await supabase
        .from("clients")
        .insert({ name, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;

      const { error: vErr } = await supabase
        .from("versions")
        .insert({ client_id: client.id, name: "v1", data: data as any, created_by: user.user?.id });
      if (vErr) throw vErr;
      return client as unknown as Client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created");
    },
  });

  const renameClient = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("clients").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client renamed");
    },
  });

  const duplicateClient = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({ name, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;

      const { data: versions } = await supabase
        .from("versions")
        .select("*")
        .eq("client_id", id);
      if (versions && versions.length > 0) {
        const inserts = versions.map((v: any) => ({
          client_id: newClient.id,
          name: v.name,
          data: v.data,
          notes: v.notes,
          created_by: user.user?.id,
        }));
        await supabase.from("versions").insert(inserts);
      }
      return newClient as unknown as Client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client duplicated");
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted");
    },
  });

  const saveVersion = useMutation({
    mutationFn: async ({ id, data, notes }: { id: string; data: PricingInputs; notes?: string }) => {
      const update: any = { data: data as any };
      if (notes !== undefined) update.notes = notes;
      const { error } = await supabase.from("versions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["versions"] });
      toast.success("Version saved");
    },
  });

  const createVersion = useMutation({
    mutationFn: async ({ clientId, name, data, notes }: { clientId: string; name: string; data: PricingInputs; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: version, error } = await supabase
        .from("versions")
        .insert({ client_id: clientId, name, data: data as any, notes: notes ?? "", created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return version as unknown as Version;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions"] });
      toast.success("Version created");
    },
  });

  return { createClient, renameClient, duplicateClient, deleteClient, saveVersion, createVersion };
}
