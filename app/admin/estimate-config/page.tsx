import { createServerSupabase } from "@/lib/supabase-server";
import { getEstimateConfig } from "@/lib/estimate-config";
import EstimateConfigForm from "./EstimateConfigForm";

export default async function AdminEstimateConfigPage() {
  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from("estimate_config").select("config").limit(1).single();
  const config = await getEstimateConfig();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">견적 계산기 단가 설정</h1>
      <p className="mb-6 text-sm text-slate-600">
        평당·옵션 단가와 업계 평균 배열을 설정합니다. 저장 후 /estimate 페이지에서 반영됩니다.
      </p>
      <EstimateConfigForm initialConfig={config} />
    </div>
  );
}
