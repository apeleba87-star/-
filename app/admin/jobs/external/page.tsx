import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ExternalJobBulkUpload from "./ExternalJobBulkUpload";
import ExternalJobPostForm from "./ExternalJobPostForm";

export default async function AdminExternalJobPostPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/jobs/external");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") redirect("/admin");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .is("parent_id", null)
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">인력구인 등록 (외부 퍼옴)</h1>
        <p className="mt-1 text-sm text-slate-500">
          외부 커뮤니티에서 가져온 구인/마감건을 등록합니다. 마감건은 평균 일당 집계에 활용되며, 진행 중 건은 마감일에 자동 마감됩니다.
        </p>
      </div>
      <ExternalJobPostForm categories={categories ?? []} />
      <ExternalJobBulkUpload />
    </div>
  );
}
