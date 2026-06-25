import MoveBudgetExplorer from "@/components/move/MoveBudgetExplorer";
import { getMoveBudgetCandidates } from "@/lib/move/budget-candidates";
import { buildPageMetadata } from "@/lib/seo";
import { createServiceSupabase } from "@/lib/supabase-server";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "내 예산으로 갈 수 있는 지역 찾기 — 클린아이덱스",
  description: "예산, 지역, 주택 유형, 거래 유형을 선택해 최근 3개월 실거래 기준으로 갈 수 있는 동네 후보를 탐색합니다.",
  path: "/",
});

async function loadCandidates() {
  try {
    return await getMoveBudgetCandidates(createServiceSupabase(), { monthsBack: 3 });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const candidates = await loadCandidates();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-8 lg:py-12">
        <MoveBudgetExplorer initialCandidates={candidates} />
      </div>
    </main>
  );
}
