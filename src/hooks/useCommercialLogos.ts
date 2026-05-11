// Logo library — global + per-account brand assets reusable across documents.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LogoLibraryItem, LogoLibraryKind, LogoLibraryScope } from "@/types/commercialDoc";

const KEY = "commercial-logos";

export function useCommercialLogos(accountId: string | null) {
  return useQuery({
    queryKey: [KEY, accountId ?? "global-only"],
    queryFn: async (): Promise<LogoLibraryItem[]> => {
      let q = supabase
        .from("commercial_logos")
        .select("*")
        .order("created_at", { ascending: false });
      if (accountId) {
        q = q.or(`scope.eq.global,account_id.eq.${accountId}`);
      } else {
        q = q.eq("scope", "global");
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LogoLibraryItem[];
    },
  });
}

/** Read intrinsic image dimensions in the browser. */
async function readImageDims(file: File): Promise<{ w: number; h: number } | null> {
  try {
    const url = URL.createObjectURL(file);
    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return dims;
  } catch {
    return null;
  }
}

export interface UploadLogoInput {
  file: File;
  scope: LogoLibraryScope;
  accountId: string | null;
  label: string;
  kind: LogoLibraryKind;
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadLogoInput): Promise<LogoLibraryItem> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "png";
      const dims = await readImageDims(input.file);
      const folder =
        input.scope === "global" ? "commercial-logos/global" : `commercial-logos/account/${input.accountId}`;
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("crm-files")
        .upload(path, input.file, { upsert: false, contentType: input.file.type });
      if (upErr) throw upErr;
      const row = {
        scope: input.scope,
        account_id: input.scope === "account" ? input.accountId : null,
        label: input.label || input.file.name,
        file_path: path,
        kind: input.kind,
        natural_width: dims?.w ?? null,
        natural_height: dims?.h ?? null,
        created_by: userData.user.id,
      };
      const { data, error } = await supabase
        .from("commercial_logos")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as LogoLibraryItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Logo uploaded");
    },
    onError: (e: Error) => toast.error(e.message ?? "Upload failed"),
  });
}

export function useDeleteLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logo: LogoLibraryItem) => {
      await supabase.storage.from("crm-files").remove([logo.file_path]);
      const { error } = await supabase.from("commercial_logos").delete().eq("id", logo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Logo deleted");
    },
    onError: (e: Error) => toast.error(e.message ?? "Delete failed"),
  });
}

/** Returns a memoizable async URL resolver — caller wraps with useEffect. */
export async function getLogoSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("crm-files")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** Hook that resolves a list of file paths to signed URLs (cached in state). */
export function useResolvedLogoUrls(paths: (string | undefined)[]) {
  const key = paths.filter(Boolean).join("|");
  return useQuery({
    queryKey: ["logo-urls", key],
    queryFn: async (): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      await Promise.all(
        Array.from(new Set(paths.filter(Boolean) as string[])).map(async (p) => {
          try {
            out[p] = await getLogoSignedUrl(p);
          } catch {
            // ignore — broken refs render as missing in the canvas
          }
        }),
      );
      return out;
    },
    enabled: paths.some(Boolean),
    staleTime: 50 * 60 * 1000,
  });
}
