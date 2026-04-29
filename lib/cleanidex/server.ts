import { createServerSupabase } from "@/lib/supabase-server";

export type CleanidexContext = {
  userId: string;
  companyId: string;
  roleCode: string | null;
};

export async function getCleanidexContext(): Promise<CleanidexContext | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.rpc("cleanidex_my_context").single();
  const contextRow = data as { company_id?: string; role_code?: string | null } | null;
  if (error || !contextRow?.company_id) return null;

  return {
    userId: user.id,
    companyId: contextRow.company_id,
    roleCode: contextRow.role_code ?? null,
  };
}
