import { createServerSupabase } from "@/lib/supabase-server";
import { getTenderKeywordsEnabled } from "@/lib/app-settings";
import TenderKeywordsForm from "./TenderKeywordsForm";

export default async function AdminTenderKeywordsPage() {
  const supabase = await createServerSupabase();
  const [keywordsRes, keywordsEnabled] = await Promise.all([
    supabase
      .from("tender_keywords")
      .select("id, keyword, keyword_type, category, sort_order, enabled")
      .order("keyword_type", { ascending: true })
      .order("sort_order", { ascending: true }),
    getTenderKeywordsEnabled(supabase),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">입찰 키워드 설정</h1>
      <p className="mb-6 text-sm text-slate-500">
        포함 키워드: 업종(청소 / 소독·방역)별로 공고에 매칭. 제외 키워드: 해당 단어가 있으면 모든 업종에서 제외(예: 청소년).
      </p>
      <TenderKeywordsForm
        initialKeywords={keywordsRes.data ?? []}
        initialKeywordsEnabled={keywordsEnabled}
      />
    </div>
  );
}
