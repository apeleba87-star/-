import { createServerSupabase } from "@/lib/supabase-server";
import UgcModeration from "@/components/admin/UgcModeration";

export default async function AdminUgcPage() {
  const supabase = await createServerSupabase();
  const { data: pending } = await supabase
    .from("ugc")
    .select("id, type, region, price_per_pyeong, comment, issue_text, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const { data: approved } = await supabase
    .from("ugc")
    .select("id, type, region, price_per_pyeong, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">UGC 검수</h1>
      <UgcModeration pending={pending ?? []} approved={approved ?? []} />
    </div>
  );
}
