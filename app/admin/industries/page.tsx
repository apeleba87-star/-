import { createServerSupabase } from "@/lib/supabase-server";
import IndustriesForm from "./IndustriesForm";

export default async function AdminIndustriesPage() {
  const supabase = await createServerSupabase();
  const { data: industries } = await supabase
    .from("industries")
    .select("id, code, name, group_key, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">업종 관리</h1>
      <p className="mb-6 text-sm text-slate-500">
        입찰 공고 필터에 사용할 업종을 추가·수정합니다. code는 API/raw 매칭용, name은 화면 표시용입니다.
      </p>
      <IndustriesForm initialIndustries={industries ?? []} />
    </div>
  );
}
