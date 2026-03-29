import { createServerSupabase } from "@/lib/supabase-server";
import NaverTrendKeywordsManager, { type KeywordGroupRow } from "./NaverTrendKeywordsManager";

export default async function AdminNaverTrendKeywordsPage() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("naver_trend_keyword_groups")
    .select("id, group_name, keywords, sort_order, is_active, sub_keywords, size_keywords, title_templates")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">네이버 마케팅 트렌드</h1>
        <p className="text-red-600">
          테이블을 불러올 수 없습니다. 마이그레이션 `095_naver_marketing_trends.sql` 적용 여부를 확인하세요:{" "}
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">네이버 마케팅 트렌드</h1>
      <p className="mb-6 text-sm text-slate-600">
        데이터랩 통합 검색어 트렌드 API로 일별 상대 지표를 수집합니다. 공개 페이지:{" "}
        <a href="/marketing-report" className="font-medium text-blue-600 hover:underline">
          /marketing-report
        </a>
      </p>
      <NaverTrendKeywordsManager initialRows={(data ?? []) as KeywordGroupRow[]} />
    </div>
  );
}
